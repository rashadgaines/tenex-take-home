import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectAndHandleEmailRequest } from '../email-handler';
import * as utils from '../utils';

describe('detectAndHandleEmailRequest', () => {
  let originalGetOpenAI: any;

  beforeEach(() => {
    // Reset mocks
    vi.restoreAllMocks();

    // Spy on getOpenAIClient to provide a mocked chat.completions.create
    originalGetOpenAI = utils.getOpenAIClient;
  });

  it('generates a minimalist draft for a simple request', async () => {
    // Stub the OpenAI responses: first call for extraction, second for draft generation
    const mockCreate = vi.fn()
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isEmailRequest: true,
                isEnhanceRequest: false,
                recipients: ['alice@example.com'],
                purpose: 'Being late',
                body: "I'm running a bit late",
              }),
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: "I'm running a bit late",
            },
          },
        ],
      });

    vi.stubGlobal('process', process);
    vi.spyOn(utils, 'getOpenAIClient').mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    } as any));

    const result = await detectAndHandleEmailRequest('Tell Alice I am late', 'user-1', 'Rashad', []);
    expect(result).not.toBeNull();
    const assistant = result!.message;
    expect(assistant.content).toContain("I'm running a bit late");
    // Should suggest send / enhance / edit
    expect(result!.suggestedActions?.some(a => a.label === 'Enhance with AI')).toBeTruthy();
  });

  it('uses last assistant draft when enhancing without explicit content', async () => {
    // User asks to enhance but doesn't provide content
    const mockCreate = vi.fn()
      // Extraction call: returns isEnhanceRequest true but empty body
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isEmailRequest: true,
                isEnhanceRequest: true,
                recipients: ['bob@example.com'],
                purpose: 'Apologize for delay',
                body: '',
              }),
            },
          },
        ],
      })
      // Enhancement generation: returns polished content
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Hi Bob,\n\nApologies for the delay — I ran into an unexpected issue but I should be available shortly.\n\nBest,\nRashad',
            },
          },
        ],
      });

    vi.spyOn(utils, 'getOpenAIClient').mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    } as any));

    // Provide history with a prior assistant draft in the --- markers
    const history = [
      { role: 'assistant', content: 'Prepared email:\n\n---\nI am sorry I will be late\n---' },
    ] as any;

    const result = await detectAndHandleEmailRequest('enhance draft', 'user-2', 'Rashad', history);
    expect(result).not.toBeNull();
    const assistant = result!.message;
    expect(assistant.content).toContain('Apologies for the delay');
  });
});
