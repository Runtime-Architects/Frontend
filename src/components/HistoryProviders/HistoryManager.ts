import { useMemo } from "react";
import { IHistoryProvider, HistoryProviderOptions } from "../HistoryProviders/IProvider";
import { NoneProvider } from "../HistoryProviders/None";
import { IndexedDBProvider } from "../HistoryProviders/IndexedDB";
import { ConversationProvider } from "../HistoryProviders/ConversationProvider";

export const useHistoryManager = (provider: HistoryProviderOptions): IHistoryProvider => {
    const providerInstance = useMemo(() => {
        switch (provider) {
            case HistoryProviderOptions.IndexedDB:
                return new IndexedDBProvider("chat-database", "chat-history");
            case HistoryProviderOptions.CosmosDB:
                return new ConversationProvider();
            case HistoryProviderOptions.None:
            default:
                return new NoneProvider();
        }
    }, [provider]);

    return providerInstance;
};
