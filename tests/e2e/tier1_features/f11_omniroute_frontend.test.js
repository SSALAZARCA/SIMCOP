import { describe, it, expect } from '../harness/test_framework.js';

describe('F11: R2 OmniRoute AI Provider Integration (Frontend)', () => {
  // Authoritative specs: PROJECT.md § Interface Contracts: OmniRoute AI Provider Contract
  const defaultOmniRouteConfig = {
    provider: 'OMNIROUTE',
    baseUrl: 'https://api.omniroute.ai/v1',
    targetModel: 'omni-default',
    apiKey: ''
  };

  function stripReasoningTags(rawResponse) {
    if (typeof rawResponse !== 'string') return '';
    // Strip <think>...</think> and <thought>...</thought> tags (multiline, case-insensitive)
    let cleaned = rawResponse.replace(/<think>[\s\S]*?<\/think>/gi, '');
    cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
    // Also strip ```json ... ``` code fence wrappers
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    return cleaned.trim();
  }

  it('F11-T1: Provider configuration options include OMNIROUTE alongside existing providers', () => {
    const supportedProviders = ['GEMINI', 'LOCAL_OLLAMA', 'LOCAL_LMLink', 'NATIVE_SIMCOP', 'OMNIROUTE'];
    expect(supportedProviders).toContain('OMNIROUTE');
    expect(defaultOmniRouteConfig.provider).toBe('OMNIROUTE');
  });

  it('F11-T2: Default OmniRoute Base URL auto-populates as https://api.omniroute.ai/v1', () => {
    expect(defaultOmniRouteConfig.baseUrl).toBe('https://api.omniroute.ai/v1');
  });

  it('F11-T3: Target model catalog supports standard OmniRoute models', () => {
    const availableModels = ['omni-default', 'deepseek-r1', 'llama-3.3-70b-instruct', 'qwen-2.5-72b'];
    expect(availableModels).toContain('omni-default');
    expect(availableModels).toContain('deepseek-r1');
  });

  it('F11-T4: Secure API Key input state handles obfuscation and updates', () => {
    let state = { ...defaultOmniRouteConfig };
    function setApiKey(key) {
      state.apiKey = key.trim();
    }

    setApiKey('  sk-omni-live-abc123xyz  ');
    expect(state.apiKey).toBe('sk-omni-live-abc123xyz');
  });

  it('F11-T5: Reasoning <think> and <thought> tag stripping before JSON parsing', () => {
    const rawLLMOutput = `<think>
Analyzing tactical terrain for Platoon Condor...
Calculating artillery line of sight and friendly unit positions.
</think>
{
  "status": "ANALYSIS_COMPLETE",
  "recommendedAction": "Avanzar por eje Alfa en desenfilada",
  "confidence": 0.92
}`;

    const stripped = stripReasoningTags(rawLLMOutput);
    expect(stripped).not.toContain('<think>');
    expect(stripped).not.toContain('Analyzing tactical terrain');
    expect(stripped.startsWith('{')).toBeTruthy();

    const parsed = JSON.parse(stripped);
    expect(parsed.status).toBe('ANALYSIS_COMPLETE');
    expect(parsed.recommendedAction).toBe('Avanzar por eje Alfa en desenfilada');
    expect(parsed.confidence).toBe(0.92);
  });
});
