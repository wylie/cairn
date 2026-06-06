import type { CommunicationProviderResult, CommunicationSendRequest } from "@/types/domain";

export interface EmailProvider {
  send(request: CommunicationSendRequest): Promise<CommunicationProviderResult>;
}

export interface SmsProvider {
  send(request: CommunicationSendRequest): Promise<CommunicationProviderResult>;
}

export interface NotificationProvider {
  send(request: CommunicationSendRequest): Promise<CommunicationProviderResult>;
}

function buildMockResult(request: CommunicationSendRequest): CommunicationProviderResult {
  return {
    ok: request.recipients.length > 0,
    providerMessageId: `mock_${request.type}_${Math.random().toString(36).slice(2, 10)}`,
    deliveredAt: new Date().toISOString(),
    error: request.recipients.length > 0 ? undefined : "No recipients"
  };
}

export const mockEmailProvider: EmailProvider = {
  async send(request) {
    return buildMockResult(request);
  }
};

export const mockSmsProvider: SmsProvider = {
  async send(request) {
    return buildMockResult(request);
  }
};

export const mockNotificationProvider: NotificationProvider = {
  async send(request) {
    return buildMockResult(request);
  }
};

export const emailProvider = mockEmailProvider;
export const smsProvider = mockSmsProvider;
export const notificationProvider = mockNotificationProvider;
