export * from './options';
export * from './types';

export const REVIEW_SECONDS = 120;
export const CHAT_SECONDS = 300;
export const CHAT_WARNING_SECONDS = 240;
export const MAX_PHOTOS = 5;
export const MIN_AGE = 18;

/** Socket.IO event names shared by app and server. */
export const EV = {
  // client -> server
  setAvailable: 'availability:set',
  updateLocation: 'location:update',
  decide: 'match:decide',
  send: 'chat:send',
  // server -> client
  state: 'state',
  message: 'chat:message',
  warning: 'chat:warning',
  error: 'error:message',
} as const;
