import client from "./client";

const addressApi = {
  getAddresses: () => client.get("/addresses/"),
};

export default addressApi;
