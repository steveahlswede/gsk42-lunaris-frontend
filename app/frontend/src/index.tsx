import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { initializeIcons } from "@fluentui/react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication, EventType, AccountInfo } from "@azure/msal-browser";
import { msalConfig, useLogin } from "./authConfig";
import { useState } from "react";

import "./index.css";

import { Chat } from "./pages/chat/Chat";
import { ChatManagerProvider } from "./contextProviderChat";
import LayoutWrapper from "./layoutWrapper";

initializeIcons();

const router = createHashRouter([
    {
        path: "/",
        element: (
            <ChatManagerProvider>
                <LayoutWrapper />
            </ChatManagerProvider>
        ),
        children: [
            {
                index: true,
                element: <Chat />
            },
            {
                path: "*",
                lazy: () => import("./pages/NoPage")
            }
        ]
    }
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>
);
