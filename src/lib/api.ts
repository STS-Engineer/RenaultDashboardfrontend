import axios from "axios";

export const api = axios.create({
  baseURL: "https://bt-renault-back.azurewebsites.net",
  withCredentials: true,
});
