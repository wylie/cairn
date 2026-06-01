export interface MockCustomerAuthUser {
  id: string;
  email: string;
  password: string;
  customerId: string;
  organizationSlugs: string[];
}

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

export function findMockCustomerUser(email: string, password: string) {
  return mockCustomerAuthUsers.find((user) => user.email.toLowerCase() === email.toLowerCase().trim() && user.password === password) ?? null;
}

export function getMockCustomerUserById(id: string) {
  return mockCustomerAuthUsers.find((user) => user.id === id) ?? null;
}
