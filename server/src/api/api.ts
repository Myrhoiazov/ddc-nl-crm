import axios from "axios";


const mollieApi = axios.create({
    baseURL: "https://api.mollie.com",
});

export const token = {
    set(token: string) {
        mollieApi.defaults.headers.common.Authorization = `Bearer ${token}`;
    },
    unset() {
        mollieApi.defaults.headers.common.Authorization = null;
    },
};