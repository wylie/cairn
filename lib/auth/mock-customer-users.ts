import { cookies } from "next/headers";

export interface MockCustomerAuthUser {
  id: string;
  email: string;
  password: string;
  customerId: string;
  organizationSlugs: string[];
}

export const MOCK_CUSTOMER_ACCOUNTS_COOKIE = "cairn_mock_customer_accounts";

export const mockCustomerAuthUsers: MockCustomerAuthUser[] = [
  {
    id: "cust_auth_001",
    email: "maya.patel@example.com",
    password: "dev1234",
    customerId: "cust_001",
    organizationSlugs: ["summit"]
  },
  {
    id: "cust_auth_002",
    email: "alex.rivera@example.com",
    password: "dev1234",
    customerId: "cust_003",
    organizationSlugs: ["summit"]
  },
  {
    id: "cust_auth_003",
    email: "oslo.fisher@example.com",
    password: "dev1234",
    customerId: "cust_004",
    organizationSlugs: ["summit"]
  }
];

export function encodeMockCustomerAccounts(users: MockCustomerAuthUser[]) {
  return Buffer.from(JSON.stringify(users), "utf8").toString("base64url");
}

export function decodeMockCustomerAccounts(value: string | undefined | null): MockCustomerAuthUser[] {
  if (!value) return [];
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as MockCustomerAuthUser[];
    return Array.isArray(parsed)
      ? parsed.filter((entry) => Boolean(entry?.id && entry?.email && entry?.password && entry?.customerId && Array.isArray(entry?.organizationSlugs)))
      : [];
  } catch {
    return [];
  }
}

export async function getStoredMockCustomerUsers() {
  try {
    const store = await cookies();
    return decodeMockCustomerAccounts(store.get(MOCK_CUSTOMER_ACCOUNTS_COOKIE)?.value);
  } catch {
    return [];
  }
}

export function mergeMockCustomerUsers(extraUsers: MockCustomerAuthUser[]) {
  const byEmail = new Map<string, MockCustomerAuthUser>();
  [...mockCustomerAuthUsers, ...extraUsers].forEach((user) => {
    byEmail.set(user.email.trim().toLowerCase(), user);
  });
  return Array.from(byEmail.values());
}

export async function findMockCustomerUser(email: string, password: string) {
  const users = mergeMockCustomerUsers(await getStoredMockCustomerUsers());
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase().trim() && user.password === password) ?? null;
}

export async function getMockCustomerUserById(id: string) {
  const users = mergeMockCustomerUsers(await getStoredMockCustomerUsers());
  return users.find((user) => user.id === id) ?? null;
}
