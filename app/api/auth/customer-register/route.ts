import { NextResponse } from "next/server";
import { AUTH_COOKIE, encodeSession } from "@/lib/auth/session";
import {
  MOCK_CUSTOMER_ACCOUNTS_COOKIE,
  decodeMockCustomerAccounts,
  encodeMockCustomerAccounts,
  mergeMockCustomerUsers,
  type MockCustomerAuthUser
} from "@/lib/auth/mock-customer-users";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    password?: string;
    customerId?: string;
    organizationSlug?: string;
  } | null;

  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const customerId = body?.customerId?.trim() ?? "";
  const organizationSlug = body?.organizationSlug?.trim() ?? "";

  if (!email || !password || !customerId || !organizationSlug) {
    return NextResponse.json({ ok: false, message: "Email, password, customer, and organization are required." }, { status: 400 });
  }

  const cookieHeader = req.headers.get("cookie") ?? "";
  const storedCookieValue = cookieHeader
    .split("; ")
    .find((entry) => entry.startsWith(`${MOCK_CUSTOMER_ACCOUNTS_COOKIE}=`))
    ?.split("=")[1];
  const existingStored = decodeMockCustomerAccounts(storedCookieValue);
  const existingUsers = mergeMockCustomerUsers(existingStored);
  if (existingUsers.some((user) => user.email.toLowerCase() === email)) {
    return NextResponse.json({ ok: false, message: "An account already exists for this email." }, { status: 409 });
  }

  const newUser: MockCustomerAuthUser = {
    id: `cust_auth_${Math.random().toString(36).slice(2, 9)}`,
    email,
    password,
    customerId,
    organizationSlugs: [organizationSlug]
  };

  const response = NextResponse.json({
    ok: true,
    user: {
      id: newUser.id,
      email: newUser.email,
      customerId: newUser.customerId,
      organizations: newUser.organizationSlugs
    }
  });

  response.cookies.set(
    MOCK_CUSTOMER_ACCOUNTS_COOKIE,
    encodeMockCustomerAccounts([...existingStored, newUser]),
    {
      path: "/",
      sameSite: "lax",
      secure: false,
      httpOnly: false
    }
  );

  response.cookies.set(
    AUTH_COOKIE,
    encodeSession({
      kind: "customer",
      userId: newUser.id,
      email: newUser.email,
      organizationSlugs: newUser.organizationSlugs,
      customerId: newUser.customerId
    }),
    {
      path: "/",
      sameSite: "lax",
      secure: false,
      httpOnly: false
    }
  );

  return response;
}
