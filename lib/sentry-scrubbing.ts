import type { TransactionEvent } from "@sentry/core";
import type { ErrorEvent, Event } from "@sentry/nextjs";
import { scrubString, scrubValue } from "@/lib/privacy-scrubbing";

function scrubExceptionMessages(event: Event) {
  if (!event.exception?.values) return;

  event.exception.values = event.exception.values.map((exception) => ({
    ...exception,
    value: exception.value ? scrubString(exception.value) : exception.value,
  }));
}

function scrubBreadcrumbs(event: Event) {
  if (!event.breadcrumbs) return;

  event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
    ...breadcrumb,
    message: breadcrumb.message ? scrubString(breadcrumb.message) : breadcrumb.message,
    data: breadcrumb.data ? scrubValue(breadcrumb.data) as Record<string, unknown> : breadcrumb.data,
  }));
}

function scrubRequest(event: Event) {
  if (!event.request) return;

  event.request = {
    ...event.request,
    url: event.request.url ? scrubString(event.request.url) : event.request.url,
    query_string: event.request.query_string ? scrubValue(event.request.query_string) as typeof event.request.query_string : event.request.query_string,
    cookies: undefined,
    data: event.request.data ? scrubValue(event.request.data) : event.request.data,
    headers: event.request.headers ? scrubValue(event.request.headers) as Record<string, string> : event.request.headers,
  };
}

function scrubUser(event: Event) {
  if (!event.user) return;

  event.user = {
    id: event.user.id,
  };
}

export function scrubSentryEvent<T extends Event>(event: T) {
  const scrubbed = scrubValue(event) as T;

  scrubUser(scrubbed);
  scrubRequest(scrubbed);
  scrubBreadcrumbs(scrubbed);
  scrubExceptionMessages(scrubbed);

  scrubbed.message = scrubbed.message ? scrubString(scrubbed.message) : scrubbed.message;
  scrubbed.transaction = scrubbed.transaction ? scrubString(scrubbed.transaction) : scrubbed.transaction;

  return scrubbed;
}

export function scrubSentryErrorEvent(event: ErrorEvent) {
  return scrubSentryEvent(event);
}

export function scrubSentryTransactionEvent(event: TransactionEvent) {
  return scrubSentryEvent(event);
}

export const sentryPrivacyOptions = {
  sendDefaultPii: false,
  beforeSend: scrubSentryErrorEvent,
  beforeSendTransaction: scrubSentryTransactionEvent,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
};
