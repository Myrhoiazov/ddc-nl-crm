import { Client } from "@/entities/Client";
import { ServerError, ValidateClientError } from "../consts/consts";
import { User } from "@/entities/User";
import { IProfile } from "@/entities/Profile";

export interface UserFormSchema {
    data?: IProfile,
    isLoading: boolean,
    error?: ServerError,
    readonly: boolean,
    validateErrors?: ValidateClientError[]
}