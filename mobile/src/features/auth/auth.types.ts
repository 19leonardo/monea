export type User = {
  id: number;
  name: string | null;
  email: string;
  currency: string;
  role: string;
  created_at: string;
};

export type RegisterData = {
  name: string;
  email: string;
  password: string;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
};
