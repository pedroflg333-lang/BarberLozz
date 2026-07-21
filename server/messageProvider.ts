// Message Provider Architecture for BarberLozz Manager
// Abstrates the message source (Laboratory, WhatsApp Cloud API, Telegram, etc.)

export interface StandardMessagePayload {
  phone: string;
  name: string;
  message: string;
  timestamp: string;
  source: 'laboratory' | 'whatsapp';
}

export interface MessageProvider {
  processIncomingMessage: (payload: StandardMessagePayload) => Promise<any>;
}

// Laboratory Message Provider Implementation
export const LaboratoryMessageProvider: MessageProvider = {
  processIncomingMessage: async (payload: StandardMessagePayload) => {
    // The provider receives the standard payload, validates it,
    // and prepares it for processing. Since the backend handles
    // the payload uniformly, this provider acts as a clean pass-through layer.
    return {
      ...payload,
      processedAt: new Date().toISOString()
    };
  }
};
