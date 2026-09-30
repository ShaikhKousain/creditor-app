import { CookieOptions, Response } from "express"

export function getAuthCookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
  }
}

export function clearAuthCookie(res: Response) {
  res.clearCookie("token")
}