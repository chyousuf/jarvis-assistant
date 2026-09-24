/**
 * Safe Arithmetic & Follow-Up Reference Calculator Tool
 * Evaluates exact mathematical computations and resolves numerical references in conversation history.
 */

export function findLastNumberInHistory(history: Array<{ role: string; content: string }>): number | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i];
    if (item.role === 'assistant' || item.role === 'jarvis' || item.role === 'model') {
      const content = item.content.trim();

      // Check if message starts with a number (e.g. "161", "161 — correct", "170\n\n...")
      const leadingMatch = content.match(/^(\d+(?:\.\d+)?)/);
      if (leadingMatch) {
        return parseFloat(leadingMatch[1]);
      }

      // Check for calculation equation result: e.g. "= 170"
      const eqMatch = content.match(/=\s*(\d+(?:\.\d+)?)/);
      if (eqMatch) {
        return parseFloat(eqMatch[1]);
      }

      // Fallback: search all numbers and find the most relevant one
      const numbers = content.match(/-?\d+(?:\.\d+)?/g);
      if (numbers && numbers.length > 0) {
        // Return the first number if it was the direct answer, or last
        const num = parseFloat(numbers[0]);
        if (!isNaN(num)) {
          return num;
        }
      }
    }
  }
  return null;
}

export function resolveArithmeticWithContext(
  message: string,
  history: Array<{ role: string; content: string }> = []
): { calculated: boolean; result: string; explanation: string } | null {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  const prevRefRegex = /(?:your|the)?\s*(?:previous\s*answer|previous\s*result|last\s*result|that|it|answer)/;

  // 1. Follow-up ADDITION
  // e.g. "Add 9 to your previous answer", "Add 9 to that", "plus 9", "Add 9"
  const prevAdd1 = lower.match(new RegExp(`(?:add|plus|\\+)\\s*(\\d+(?:\\.\\d+)?)\\s*(?:to\\s+)?${prevRefRegex.source}`, 'i'));
  const prevAdd2 = lower.match(new RegExp(`${prevRefRegex.source}\\s*(?:plus|\\+)\\s*(\\d+(?:\\.\\d+)?)`, 'i'));
  const standaloneAdd = lower.match(/^(?:add|plus|\+)\s*(\d+(?:\.\d+)?)$/i);

  const addMatch = prevAdd1 || prevAdd2 || standaloneAdd;
  if (addMatch) {
    const operand = parseFloat(addMatch[1]);
    const prevNum = findLastNumberInHistory(history);
    if (prevNum !== null) {
      const sum = Math.round((prevNum + operand) * 1000000) / 1000000;
      return {
        calculated: true,
        result: sum.toString(),
        explanation: `${prevNum} + ${operand} = ${sum}`
      };
    }
  }

  // 2. Follow-up SUBTRACTION
  // e.g. "Subtract 5 from your previous answer", "previous answer minus 5", "- 5", "minus 5"
  const prevSub1 = lower.match(new RegExp(`(?:subtract|minus|\\-)\\s*(\\d+(?:\\.\\d+)?)\\s*from\\s*${prevRefRegex.source}`, 'i'));
  const prevSub2 = lower.match(new RegExp(`${prevRefRegex.source}\\s*(?:minus|\\-)\\s*(\\d+(?:\\.\\d+)?)`, 'i'));
  const standaloneSub = lower.match(/^(?:subtract|minus|\-)\s*(\d+(?:\.\d+)?)$/i);

  const subMatch = prevSub1 || prevSub2 || standaloneSub;
  if (subMatch) {
    const operand = parseFloat(subMatch[1]);
    const prevNum = findLastNumberInHistory(history);
    if (prevNum !== null) {
      const diff = Math.round((prevNum - operand) * 1000000) / 1000000;
      return {
        calculated: true,
        result: diff.toString(),
        explanation: `${prevNum} - ${operand} = ${diff}`
      };
    }
  }

  // 3. Follow-up MULTIPLICATION
  // e.g. "Multiply your previous answer by 2", "that times 4", "* 3"
  const prevMul1 = lower.match(new RegExp(`(?:multiply)\\s*${prevRefRegex.source}\\s*by\\s*(\\d+(?:\\.\\d+)?)`, 'i'));
  const prevMul2 = lower.match(new RegExp(`${prevRefRegex.source}\\s*(?:times|\\*|x|multiplied\\s*by)\\s*(\\d+(?:\\.\\d+)?)`, 'i'));
  const standaloneMul = lower.match(/^(?:multiply\s*by|times|\*|x)\s*(\d+(?:\.\d+)?)$/i);

  const mulMatch = prevMul1 || prevMul2 || standaloneMul;
  if (mulMatch) {
    const operand = parseFloat(mulMatch[1]);
    const prevNum = findLastNumberInHistory(history);
    if (prevNum !== null) {
      const prod = Math.round((prevNum * operand) * 1000000) / 1000000;
      return {
        calculated: true,
        result: prod.toString(),
        explanation: `${prevNum} × ${operand} = ${prod}`
      };
    }
  }

  // 4. Follow-up DIVISION
  // e.g. "Divide your previous answer by 2", "that divided by 4"
  const prevDiv1 = lower.match(new RegExp(`(?:divide)\\s*${prevRefRegex.source}\\s*by\\s*(\\d+(?:\\.\\d+)?)`, 'i'));
  const prevDiv2 = lower.match(new RegExp(`${prevRefRegex.source}\\s*(?:divided\\s*by|\\/)\\s*(\\d+(?:\\.\\d+)?)`, 'i'));
  const standaloneDiv = lower.match(/^(?:divide\s*by|\/)\s*(\\d+(?:\\.\\d+)?)$/i);

  const divMatch = prevDiv1 || prevDiv2 || standaloneDiv;
  if (divMatch) {
    const operand = parseFloat(divMatch[1]);
    const prevNum = findLastNumberInHistory(history);
    if (prevNum !== null && operand !== 0) {
      const quot = Math.round((prevNum / operand) * 1000000) / 1000000;
      return {
        calculated: true,
        result: quot.toString(),
        explanation: `${prevNum} ÷ ${operand} = ${quot}`
      };
    }
  }

  // 5. Direct exact arithmetic queries:
  // e.g. "23 multiplied by 7", "What is 23 * 7?", "17 x 6", "17 * 6", "Calculate 25 + 14"
  const directMul = lower.match(/^(?:what\s+is\s+|calculate\s+)?(\d+(?:\.\d+)?)\s*(?:\*|x|multiplied\s+by|times)\s*(\d+(?:\.\d+)?)[?.]*$/i);
  if (directMul) {
    const a = parseFloat(directMul[1]);
    const b = parseFloat(directMul[2]);
    const res = Math.round((a * b) * 1000000) / 1000000;
    return { calculated: true, result: res.toString(), explanation: `${a} × ${b} = ${res}` };
  }

  const directAdd = lower.match(/^(?:what\s+is\s+|calculate\s+)?(\d+(?:\.\d+)?)\s*(?:\+|plus)\s*(\d+(?:\.\d+)?)[?.]*$/i);
  if (directAdd) {
    const a = parseFloat(directAdd[1]);
    const b = parseFloat(directAdd[2]);
    const res = Math.round((a + b) * 1000000) / 1000000;
    return { calculated: true, result: res.toString(), explanation: `${a} + ${b} = ${res}` };
  }

  const directSub = lower.match(/^(?:what\s+is\s+|calculate\s+)?(\d+(?:\.\d+)?)\s*(?:\-|minus)\s*(\d+(?:\.\d+)?)[?.]*$/i);
  if (directSub) {
    const a = parseFloat(directSub[1]);
    const b = parseFloat(directSub[2]);
    const res = Math.round((a - b) * 1000000) / 1000000;
    return { calculated: true, result: res.toString(), explanation: `${a} - ${b} = ${res}` };
  }

  const directDiv = lower.match(/^(?:what\s+is\s+|calculate\s+)?(\d+(?:\.\d+)?)\s*(?:\/|divided\s+by)\s*(\d+(?:\.\d+)?)[?.]*$/i);
  if (directDiv) {
    const a = parseFloat(directDiv[1]);
    const b = parseFloat(directDiv[2]);
    if (b !== 0) {
      const res = Math.round((a / b) * 1000000) / 1000000;
      return { calculated: true, result: res.toString(), explanation: `${a} ÷ ${b} = ${res}` };
    }
  }

  return null;
}
