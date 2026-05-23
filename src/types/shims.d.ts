declare module "@/api/base44Client" {
  export interface FirebaseEntityRepository {
    list(orderByStr?: string, limitNum?: number): Promise<any[]>;
    create(data: any): Promise<any>;
    update(id: string, data: any): Promise<any>;
    delete(id: string): Promise<{ id: string }>;
  }

  export const base44: {
    entities: Record<string, FirebaseEntityRepository>;
    auth: {
      me(): Promise<any>;
      loginViaEmailPassword(email: string, password: string): Promise<{ access_token: string }>;
      loginWithProvider(provider: string, redirectUrl?: string): Promise<any>;
      register(data: any): Promise<{ success: boolean }>;
      verifyOtp(data: any): Promise<{ access_token: string }>;
      resendOtp(email: string): Promise<{ success: boolean }>;
      setToken(token: string): void;
      resetPasswordRequest(email: string): Promise<{ success: boolean }>;
      resetPassword(data: any): Promise<{ success: boolean }>;
      logout(redirectUrl?: string): Promise<void>;
      redirectToLogin(redirectUrl?: string): void;
    };
    integrations: {
      Core: {
        InvokeLLM(params: { prompt: string; response_json_schema?: any; file?: File }): Promise<any>;
        SendEmail(params: { to: string; subject: string; body: string; [key: string]: any }): Promise<{ success: boolean }>;
        UploadFile(params: { file: File }): Promise<{ file_url: string }>;
      };
    };
  };
}

declare module "@/components/ui/button" {
  import * as React from "react";
  export const Button: React.ComponentType<any>;
}

declare module "@/components/ui/input" {
  import * as React from "react";
  export const Input: React.ComponentType<any>;
}

declare module "@/components/ui/label" {
  import * as React from "react";
  export const Label: React.ComponentType<any>;
}

declare module "@/components/ui/badge" {
  import * as React from "react";
  export const Badge: React.ComponentType<any>;
}

declare module "@/components/ui/dialog" {
  import * as React from "react";
  export const Dialog: React.ComponentType<any>;
  export const DialogPortal: React.ComponentType<any>;
  export const DialogOverlay: React.ComponentType<any>;
  export const DialogTrigger: React.ComponentType<any>;
  export const DialogClose: React.ComponentType<any>;
  export const DialogContent: React.ComponentType<any>;
  export const DialogHeader: React.ComponentType<any>;
  export const DialogFooter: React.ComponentType<any>;
  export const DialogTitle: React.ComponentType<any>;
  export const DialogDescription: React.ComponentType<any>;
}

declare module "@/components/ui/select" {
  import * as React from "react";
  export const Select: React.ComponentType<any>;
  export const SelectGroup: React.ComponentType<any>;
  export const SelectValue: React.ComponentType<any>;
  export const SelectTrigger: React.ComponentType<any>;
  export const SelectContent: React.ComponentType<any>;
  export const SelectLabel: React.ComponentType<any>;
  export const SelectItem: React.ComponentType<any>;
  export const SelectSeparator: React.ComponentType<any>;
  export const SelectScrollUpButton: React.ComponentType<any>;
  export const SelectScrollDownButton: React.ComponentType<any>;
}

declare module "@/components/ui/searchable-select" {
  import * as React from "react";
  export const SearchableSelect: React.ComponentType<any>;
}
