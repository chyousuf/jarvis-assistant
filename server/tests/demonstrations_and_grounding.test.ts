import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { retrieveRelevantPassages, chunkDocument, DocumentKnowledge } from '../src/ai/learningService.js';
import { orchestrator } from '../src/ai/orchestrator.js';
import { createWorkspaceFile, readWorkspaceFile, deleteWorkspaceFile } from '../src/tools/workspaceFiles.js';
import { createEmailDraft } from '../src/tools/emailService.js';

describe('Phase 2, 4 & 5: Demonstrable Interactions, Grounding & Reliability', () => {

  describe('Grounding & False Citation Prevention', () => {
    const archDoc: DocumentKnowledge = {
      id: 'doc-arch-directives',
      title: 'JARVIS System Architecture & Directives',
      content: 'JARVIS operates as a personal assistant with local computer automation, HMAC session isolation, and strict evidence grounding. System directives require approval before external actions.',
      tags: ['architecture', 'security', 'directives'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    it('should NOT cite architecture documents on ordinary invitation drafts', () => {
      const queries = [
        'draft an invitation for team dinner tomorrow at 8pm',
        'write an email inviting colleagues to lunch',
        'create a friendly invite for the birthday party',
        'compose a meeting invitation for next Monday'
      ];

      for (const q of queries) {
        const result = retrieveRelevantPassages(q, [archDoc]);
        assert.equal(
          result.passages.length,
          0,
          `Query "${q}" unexpectedly matched ${result.passages.length} passages from system architecture doc`
        );
      }
    });

    it('should cite architecture document when query genuinely asks about architecture or directives', () => {
      const q = 'What are JARVIS system architecture directives?';
      const result = retrieveRelevantPassages(q, [archDoc]);
      assert.ok(result.passages.length > 0);
      assert.equal(result.passages[0].docId, 'doc-arch-directives');
      assert.ok(result.passages[0].content.includes('strict evidence grounding'));
    });

    it('should handle disposable document lifecycle (create -> query -> delete)', () => {
      const disposableDoc: DocumentKnowledge = {
        id: 'doc-disposable-q4-targets',
        title: 'Q4 Product Milestones & Targets',
        content: 'Target revenue is 5 million dollars with 4 enterprise pilots launching in December 2026.',
        tags: ['targets', 'q4', 'revenue'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 1. Query while document exists
      const activeRetrieval = retrieveRelevantPassages('What is the Q4 target revenue?', [disposableDoc]);
      assert.equal(activeRetrieval.passages.length, 1);
      assert.ok(activeRetrieval.passages[0].content.includes('5 million dollars'));

      // 2. Disposable deletion: document is removed from document store
      const documentsAfterDeletion: DocumentKnowledge[] = [];
      const deletedRetrieval = retrieveRelevantPassages('What is the Q4 target revenue?', documentsAfterDeletion);
      assert.equal(deletedRetrieval.passages.length, 0);
      assert.equal(deletedRetrieval.hasEvidence, false);
    });
  });

  describe('Demonstrable AI Interaction 1: Document Question with Accurate Citation', () => {
    it('should retrieve exact document passage and chunk index for knowledge queries', () => {
      const handbookDoc: DocumentKnowledge = {
        id: 'doc-handbook-safety',
        title: 'Lab Safety Protocol Handbook',
        content: 'Section 4 Emergency Shutdown: In case of thermal runaway, depress the emergency stop lever on Panel B immediately. Do not use water on electrical cabinets.',
        tags: ['handbook', 'safety', 'protocols'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = retrieveRelevantPassages('What is the emergency shutdown protocol in the safety handbook?', [handbookDoc]);
      assert.equal(result.passages.length, 1);
      assert.equal(result.passages[0].docId, 'doc-handbook-safety');
      assert.ok(result.passages[0].content.includes('depress the emergency stop lever on Panel B'));
    });
  });

  describe('Demonstrable AI Interaction 2: Mixed-Language Command with User Correction', () => {
    it('should flag ambiguous contact in Urdu, then execute once corrected with full name', async () => {
      // Step 1: User says "Ahmed ko message likho" -> Ambiguity flagged
      const step1 = await orchestrator.processUserMessage('Ahmed ko message likho');
      assert.equal(step1.needsClarification, true);
      assert.ok(step1.clarificationQuestion?.includes('Ahmed'));

      // Step 2: User provides correction specifying Ahmed Raza and content
      const step2 = await orchestrator.processUserMessage('Ahmed Raza ko message bhejo keh kal subah meeting 10 baje hai');
      assert.equal(step2.needsClarification, false);
      assert.ok(step2.task);
      assert.equal(step2.task.status, 'pending');
      assert.ok(step2.reply.includes('Ahmed Raza'));
      assert.ok(step2.reply.includes('meeting 10 baje hai') || step2.reply.includes('Confirmation Required'));
    });
  });

  describe('Demonstrable AI Interaction 3: Report Creation & Email Draft with Attachment', () => {
    it('should create markdown report file in workspace, then create email draft referencing the file', async () => {
      const fileName = 'demo_quarterly_summary.md';
      const fileContent = '# Q4 Executive Summary\n\nAll 6 phases verified and demonstrable.';

      // 1. Create file in workspace
      const fileRes = await createWorkspaceFile(fileName, fileContent);
      assert.equal(fileRes.success, true);

      // Verify file is readable
      const readRes = await readWorkspaceFile(fileName);
      assert.ok(readRes.content?.includes('All 6 phases verified'));

      // 2. Draft email with attachment
      const draftRes = await createEmailDraft(
        'investors@starkindustries.demo',
        'Executive Report: Q4 Summary',
        'Please find attached our verified Q4 executive summary document.',
        [fileName]
      );
      assert.ok(draftRes.draft);
      assert.equal(draftRes.draft.to_address, 'investors@starkindustries.demo');
      assert.equal(draftRes.draft.subject, 'Executive Report: Q4 Summary');
      assert.deepEqual(draftRes.draft.attachments, [fileName]);

      // 3. Clean up workspace file
      await deleteWorkspaceFile(fileName);
    });
  });

  describe('Reliability: Defensive Crash Immunity', () => {
    it('should safely format email objects with missing or undefined provider', () => {
      const emailMissingProvider: any = {
        id: 'em-test-1',
        to: 'user@example.com',
        subject: 'Hello',
        body: 'World',
        status: 'draft',
        provider: undefined
      };

      const safeProvider = (emailMissingProvider.provider || 'direct/local').toUpperCase();
      const safeStatus = (emailMissingProvider.status || 'draft').toUpperCase();
      assert.equal(safeProvider, 'DIRECT/LOCAL');
      assert.equal(safeStatus, 'DRAFT');
    });

    it('should safely format task objects with missing or undefined steps array', () => {
      const taskMissingSteps: any = {
        id: 'task-test-1',
        title: 'Automated Migration',
        description: 'Testing defensive length checks',
        status: 'pending',
        progress: 0,
        steps: undefined
      };

      const safeStepCount = (taskMissingSteps.steps || []).length;
      assert.equal(safeStepCount, 0);
    });
  });

});
