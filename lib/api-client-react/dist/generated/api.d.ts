import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { Conversation, ConversationWithMessages, CreateConversationBody, DeleteConversation200, HealthStatus, SendOpenaiMessageBody } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * Returns server health status
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all conversations
 */
export declare const getListConversationsUrl: () => string;
export declare const listConversations: (options?: RequestInit) => Promise<Conversation[]>;
export declare const getListConversationsQueryKey: () => readonly ["/api/openai/conversations"];
export declare const getListConversationsQueryOptions: <TData = Awaited<ReturnType<typeof listConversations>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listConversations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listConversations>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListConversationsQueryResult = NonNullable<Awaited<ReturnType<typeof listConversations>>>;
export type ListConversationsQueryError = ErrorType<unknown>;
/**
 * @summary List all conversations
 */
export declare function useListConversations<TData = Awaited<ReturnType<typeof listConversations>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listConversations>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new conversation
 */
export declare const getCreateConversationUrl: () => string;
export declare const createConversation: (createConversationBody: CreateConversationBody, options?: RequestInit) => Promise<Conversation>;
export declare const getCreateConversationMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createConversation>>, TError, {
        data: BodyType<CreateConversationBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createConversation>>, TError, {
    data: BodyType<CreateConversationBody>;
}, TContext>;
export type CreateConversationMutationResult = NonNullable<Awaited<ReturnType<typeof createConversation>>>;
export type CreateConversationMutationBody = BodyType<CreateConversationBody>;
export type CreateConversationMutationError = ErrorType<unknown>;
/**
 * @summary Create a new conversation
 */
export declare const useCreateConversation: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createConversation>>, TError, {
        data: BodyType<CreateConversationBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createConversation>>, TError, {
    data: BodyType<CreateConversationBody>;
}, TContext>;
/**
 * @summary Get a conversation with its messages
 */
export declare const getGetConversationUrl: (id: number) => string;
export declare const getConversation: (id: number, options?: RequestInit) => Promise<ConversationWithMessages>;
export declare const getGetConversationQueryKey: (id: number) => readonly [`/api/openai/conversations/${number}`];
export declare const getGetConversationQueryOptions: <TData = Awaited<ReturnType<typeof getConversation>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getConversation>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getConversation>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetConversationQueryResult = NonNullable<Awaited<ReturnType<typeof getConversation>>>;
export type GetConversationQueryError = ErrorType<unknown>;
/**
 * @summary Get a conversation with its messages
 */
export declare function useGetConversation<TData = Awaited<ReturnType<typeof getConversation>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getConversation>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Delete a conversation
 */
export declare const getDeleteConversationUrl: (id: number) => string;
export declare const deleteConversation: (id: number, options?: RequestInit) => Promise<DeleteConversation200>;
export declare const getDeleteConversationMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteConversation>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteConversation>>, TError, {
    id: number;
}, TContext>;
export type DeleteConversationMutationResult = NonNullable<Awaited<ReturnType<typeof deleteConversation>>>;
export type DeleteConversationMutationError = ErrorType<unknown>;
/**
 * @summary Delete a conversation
 */
export declare const useDeleteConversation: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteConversation>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteConversation>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Send a message (streaming SSE)
 */
export declare const getSendMessageUrl: (id: number) => string;
export declare const sendMessage: (id: number, sendOpenaiMessageBody: SendOpenaiMessageBody, options?: RequestInit) => Promise<string>;
export declare const getSendMessageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
        id: number;
        data: BodyType<SendOpenaiMessageBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
    id: number;
    data: BodyType<SendOpenaiMessageBody>;
}, TContext>;
export type SendMessageMutationResult = NonNullable<Awaited<ReturnType<typeof sendMessage>>>;
export type SendMessageMutationBody = BodyType<SendOpenaiMessageBody>;
export type SendMessageMutationError = ErrorType<unknown>;
/**
 * @summary Send a message (streaming SSE)
 */
export declare const useSendMessage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendMessage>>, TError, {
        id: number;
        data: BodyType<SendOpenaiMessageBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendMessage>>, TError, {
    id: number;
    data: BodyType<SendOpenaiMessageBody>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map