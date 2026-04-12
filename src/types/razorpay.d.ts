export {};

declare global {
  interface Window {
    Razorpay: new (options: {
      key: string;
      amount: number;
      currency: string;
      name: string;
      description?: string;
      order_id: string;
      prefill?: {
        name?: string;
        email?: string;
      };
      theme?: {
        color?: string;
      };
      handler: (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => void;
      modal?: {
        ondismiss?: () => void;
      };
    }) => {
      open: () => void;
      on: (
        eventName: 'payment.failed',
        callback: (response: {
          error: {
            code?: string;
            description?: string;
            source?: string;
            step?: string;
            reason?: string;
            metadata?: {
              order_id?: string;
              payment_id?: string;
            };
          };
        }) => void
      ) => void;
    };
  }
}
