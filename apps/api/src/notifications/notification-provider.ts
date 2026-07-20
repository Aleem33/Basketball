export type NotificationPayload = {
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
};

export type DeliveryResult =
  | { status: 'SENT'; providerMessageId?: string }
  | { status: 'INVALID_TARGET'; errorCode: string }
  | { status: 'FAILED'; retryable: boolean; errorCode: string }
  | { status: 'SUPPRESSED'; reason: string };

export type NotificationProvider = {
  readonly name: string;
  send(encryptedTarget: string, payload: NotificationPayload): Promise<DeliveryResult>;
};

export class DisabledPushProvider implements NotificationProvider {
  readonly name = 'disabled';

  send(): Promise<DeliveryResult> {
    return Promise.resolve({
      status: 'SUPPRESSED',
      reason: 'Remote push transport is not configured',
    });
  }
}
