import type { OnRpcRequestHandler } from "@metamask/snaps-sdk";
import { assert } from "@metamask/utils";

type MethodPermission = "*" | string[];

const RPC_PERMISSIONS: Record<string, MethodPermission> = {
  getInfo: ["https://metamask.io", "https://app.fintax.tech"],
};

const isAllowed = (method: string, origin: string) => {
  return (
    RPC_PERMISSIONS[method] === "*" || RPC_PERMISSIONS[method]?.includes(origin)
  );
};

/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */

export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  if (!isAllowed(request.method, origin)) {
    throw new Error(
      `Method ${request.method} not authorized for origin ${origin}.`
    );
  }
  switch (request.method) {
    case "getInfo":
      return btoa(await getInfo());
    default:
      throw new Error("Method not found.");
  }
};

/**
 * Get user token.
 * @returns The result of user token.
 */
async function getToken() {
  const persistedData = await snap.request({
    method: "snap_manageState",
    params: { operation: "get" },
  });
  if (!persistedData?.ut) {
    const tokenResponse = await fetch(`https://www.fintax.tech/snap/token`);
    if (!tokenResponse.ok) {
      throw new Error("Network response was not ok");
    }
    const jsObj = await tokenResponse.json();
    const tokenString = JSON.stringify(jsObj.data);
    await snap.request({
      method: "snap_manageState",
      params: {
        operation: "update",
        newState: { ut: tokenString },
      },
    });
    return tokenString;
  }
  return persistedData.ut;
}

/**
 * Get user account address and active chain id.
 * @returns The result of account info.
 */
async function getInfo() {
  const ut = await getToken();
  const accounts = await ethereum.request<string[]>({
    method: "eth_requestAccounts",
  });
  assert(accounts, "Ethereum provider did not return accounts.");
  const chainId = await ethereum.request({ method: "eth_chainId" });
  assert(chainId, "Ethereum provider did not return chain id.");
  const info = {
    ut,
    accounts,
    chainId,
  };
  return JSON.stringify(info);
}
