import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id:                  string;
      name?:               string | null;
      email?:              string | null;
      image?:              string | null;
      googleAccessToken?:  string;
      isEmployee:          boolean;
      employeeRole:        string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:                  string;
    googleAccessToken?:  string;
    googleRefreshToken?: string;
    isEmployee?:         boolean;
    employeeRole?:       string | null;
  }
}