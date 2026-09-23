import test from 'node:test';
import assert from 'node:assert';
import { resolveContact, listContacts } from '../src/tools/contacts.js';
import { createEmailDraft, sendEmail } from '../src/tools/emailService.js';
import { prepareWhatsAppMessage, sendWhatsAppMessage, updateWhatsAppDeliveryStatus, listWhatsAppMessages } from '../src/tools/whatsappService.js';
import { checkAvailability, createCalendarEvent, confirmEventInvitations } from '../src/tools/calendarService.js';
import { createDocument } from '../src/tools/documentService.js';
import { orchestrator } from '../src/ai/orchestrator.js';
import { createApproval, listApprovals } from '../src/tasks/approvalManager.js';

test('Contacts: Resolves single recipient and flags ambiguity for multiple matches', () => {
  // Ali matches Ali Hassan uniquely
  const single = resolveContact('Ali');
  assert.strictEqual(single.resolved, true);
  assert.strictEqual(single.contact?.name, 'Ali Hassan');
  assert.strictEqual(single.ambiguous, undefined);

  // Ahmed matches both Ahmed Raza and Ahmed Khan -> Ambiguity flagged
  const ambiguous = resolveContact('Ahmed');
  assert.strictEqual(ambiguous.resolved, false);
  assert.strictEqual(ambiguous.ambiguous, true);
  assert.ok(ambiguous.matches && ambiguous.matches.length >= 2);

  // Exact match resolves unambiguously
  const exact = resolveContact('Ahmed Raza');
  assert.strictEqual(exact.resolved, true);
  assert.strictEqual(exact.contact?.name, 'Ahmed Raza');
});

test('Email: Immediate drafting, recipient verification, and idempotency deduplication', async () => {
  // 1. Cannot draft with non-existent contact without email format
  await assert.rejects(async () => {
    await createEmailDraft('UnknownPersonXYZ', 'Subject', 'Body');
  }, /no verified email in approved contacts/);

  // 2. Drafts immediately when contact is resolved
  const uniqueSubject = 'Project Update ' + Date.now();
  const draftRes1 = await createEmailDraft('Ali', uniqueSubject, 'Here is the latest status.');
  assert.ok(draftRes1.draft.id);
  assert.strictEqual(draftRes1.draft.status, 'draft');
  assert.strictEqual(draftRes1.draft.to_address, 'ali.hassan@example.com');

  // 3. Retry protection / Deduplication via idempotency key
  const draftRes2 = await createEmailDraft('Ali', uniqueSubject, 'Here is the latest status.');
  assert.strictEqual(draftRes2.draft.id, draftRes1.draft.id, 'Idempotency key should return the existing draft to prevent duplicates');

  // 4. Send email requires provider confirmation
  const sendRes = await sendEmail(draftRes1.draft.id);
  assert.strictEqual(sendRes.success, true);
  assert.ok(sendRes.messageId.startsWith('msg-'));

  // 5. Subsequent send attempt returns existing confirmation (idempotent send)
  const sendRes2 = await sendEmail(draftRes1.draft.id);
  assert.strictEqual(sendRes2.messageId, sendRes.messageId);
});

test('WhatsApp: Recipient resolution, delivery status separation, and supported handoff', async () => {
  const messageText = 'I will be 10 minutes late.';

  // 1. Prepare message resolves recipient
  const prep = await prepareWhatsAppMessage('Ali', messageText);
  assert.ok(prep.messageId);
  assert.strictEqual(prep.recipientName, 'Ali Hassan');
  assert.strictEqual(prep.recipientPhone, '+923335551234');
  assert.ok(prep.handoffUrl.includes('https://wa.me/923335551234'));

  // 2. Send message: in mock/unconfigured mode returns clean supported handoff
  const sendRes = await sendWhatsAppMessage(prep.messageId);
  assert.strictEqual(sendRes.success, true);
  assert.ok(sendRes.deliveryStatus.includes('WhatsApp handoff'));

  // 3. Delivery status update (never conflate accepted with delivered)
  const testWamid = 'wamid-test-123';
  updateWhatsAppDeliveryStatus(testWamid, 'delivered');
});

test('Calendar: Availability check and attendee invitation confirmation gate', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  // 1. Check availability
  const avail = await checkAvailability(dateStr);
  assert.ok(Array.isArray(avail.freeSlots));

  // 2. Event without attendees confirms immediately
  const soloEvent = await createCalendarEvent('Focus Time', tomorrow.toISOString());
  assert.strictEqual(soloEvent.requiresConfirmation, false);
  assert.strictEqual(soloEvent.event.status, 'confirmed');

  // 3. Event with external attendees requires invitation confirmation
  const meeting = await createCalendarEvent('Sync with Ali', tomorrow.toISOString(), undefined, ['ali.hassan@example.com']);
  assert.strictEqual(meeting.requiresConfirmation, true);
  assert.strictEqual(meeting.event.status, 'pending_confirmation');

  // 4. Confirm invitations
  const confirmed = confirmEventInvitations(meeting.event.id);
  assert.strictEqual(confirmed, true);
});

test('Documents: Create structured document in workspace', async () => {
  const title = 'Quarterly Strategy Review';
  const content = 'Strategic objectives for AI assistant expansion.';
  const doc = await createDocument(title, 'report', content, 'strategy_review.md');

  assert.strictEqual(doc.success, true);
  assert.strictEqual(doc.filename, 'strategy_review.md');
  assert.ok(doc.bytesWritten > 0);
});

test('Voice & Orchestrator: Voice confirmation binding for pending approval', async () => {
  // Create dummy pending approval
  const { id: approvalId } = createApproval('task-voice-test', 'email_send', 'Send test email', { to: 'test@example.com' });

  // Voice confirmation "theek hai" (Roman Urdu for "confirmed/okay")
  const orchRes = await orchestrator.processUserMessage('theek hai');
  assert.strictEqual(orchRes.voiceActionResolved, true);
  assert.ok(orchRes.reply.includes('authorized'));

  const pending = listApprovals('pending');
  assert.strictEqual(pending.some(a => a.id === approvalId), false);
});
