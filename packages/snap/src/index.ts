import type { OnRpcRequestHandler} from '@metamask/snaps-sdk';
import {UnauthorizedError} from '@metamask/snaps-sdk';
import { assert } from '@metamask/utils';

type MethodPermission = "*" | string[];

const RPC_PERMISSIONS: Record<string, MethodPermission> = {
  get_info: [
    "https://metamask.io",
    "https://www.thetaxdao.com",
    "http://localhost:8000",
  ]
};

const isAllowed = (method: string, origin: string) => {
  return RPC_PERMISSIONS[method] === "*" || RPC_PERMISSIONS[method]?.includes(origin);
};

export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  if (!isAllowed(request.method, origin)) {
    throw new UnauthorizedError(`Method ${request.method} not authorized for origin ${origin}.`);
  }
  switch (request.method) {
    case 'get_info':
      return btoa(await getInfo());
    default:
      throw new Error('Method not found.');
  }
};

async function getToken() {
  await snap.request({
    method: "snap_manageState",
    params: {
      operation: "update",
      newState: { ut: 'testtoken'},
    },
  });
  const persistedData = await snap.request({
    method: "snap_manageState",
    params: { operation: "get" },
  });
  if (!persistedData?.ut) {
    const tokenResponse = await fetch(`https://www.thetaxdao.com/snap/api/token`);
    if (!tokenResponse.ok) {
      throw new Error('Network response was not ok');
    }
    const jsObj = await tokenResponse.json();
    const tokenString = JSON.stringify(jsObj.data);
    await snap.request({
      method: "snap_manageState",
      params: {
        operation: "update",
        newState: { ut: tokenString},
      },
    });
    return tokenString
  } else {
    return persistedData.ut
  }
}

async function getInfo() {
  const ut = await getToken();
  const accounts = await ethereum.request<string[]>({
    method: 'eth_requestAccounts',
  });
  assert(accounts, 'Ethereum provider did not return accounts.');
  const chainId = await ethereum.request({ method: 'eth_chainId' });
  assert(chainId, 'Ethereum provider did not return chain id.');
  const info = {
    ut: ut,
    accounts: accounts,
    chainId: chainId
  };
  return JSON.stringify(info);
}