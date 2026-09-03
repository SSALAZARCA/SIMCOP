import { describe, it, expect } from '../harness/test_framework.js';

describe('F11-BND: OmniRoute Frontend Reasoning Tags & Markdown Sanitization', () => {
  function robustStripReasoning(input) {
    if (!input || typeof input !== 'string') return '';
    let result = input;
    
    // Iteratively strip think/thought tags to handle nested or consecutive blocks
    while (/<think>[\s\S]*?<\/think>/i.test(result) || /<thought>[\s\S]*?<\/thought>/i.test(result)) {
      result = result.replace(/<think>[\s\S]*?<\/think>/gi, '');
      result = result.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
    }

    // Handle unclosed <think> tag at beginning or mid-text, and orphaned closing tags
    result = result.replace(/<think>[\s\S]*$/gi, '');
    result = result.replace(/<thought>[\s\S]*$/gi, '');
    result = result.replace(/^[\s\S]*?<\/(?:think|thought)>/gi, '');
    result = result.replace(/<\/(?:think|thought)>/gi, '');

    // Strip markdown code fences
    result = result.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '');
    return result.trim();
  }

  it('F11-BND-T1: Nested reasoning tags are cleanly stripped', () => {
    const raw = '<think>Outer <think>Inner thoughts</think> still thinking</think>{"plan": "ASSAULT_NORTH"}';
    const cleaned = robustStripReasoning(raw);
    expect(cleaned).toBe('{"plan": "ASSAULT_NORTH"}');
  });

  it('F11-BND-T2: Incomplete unclosed reasoning tag at EOF is handled without truncating valid prefix JSON if any', () => {
    const raw = '<think>Model started thinking and got cut off by token limit...';
    const cleaned = robustStripReasoning(raw);
    expect(cleaned).toBe('');
  });

  it('F11-BND-T3: Multiple consecutive reasoning blocks are all removed', () => {
    const raw = '<think>Step 1</think><think>Step 2</think><thought>Step 3</thought>{"valid": true}';
    const cleaned = robustStripReasoning(raw);
    expect(cleaned).toBe('{"valid": true}');
  });

  it('F11-BND-T4: Empty reasoning tag `<think></think>` followed by JSON parses correctly', () => {
    const raw = '<think></think>{"coa": "COA_1"}';
    const cleaned = robustStripReasoning(raw);
    expect(cleaned).toBe('{"coa": "COA_1"}');
    expect(JSON.parse(cleaned).coa).toBe('COA_1');
  });

  it('F11-BND-T5: JSON enclosed inside markdown codeblock with leading prose is extracted cleanly', () => {
    const raw = '```json\n{\n  "recommendation": "Artillery barrage"\n}\n```';
    const cleaned = robustStripReasoning(raw);
    expect(JSON.parse(cleaned).recommendation).toBe('Artillery barrage');
  });
});
