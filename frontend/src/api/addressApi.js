import client from "./client";

const addressApi = {
  getAddresses: () => client.get("/addresses/").then((response) => response.data),
  createAddress: (data) => client.post("/addresses/", data).then((response) => response.data),
  updateAddress: (id, data) => client.patch(`/addresses/${id}/`, data).then((response) => response.data),
  deleteAddress: (id) => client.delete(`/addresses/${id}/`),
  setDefault: (id) => client.patch(`/addresses/${id}/default/`).then((response) => response.data),
  getCountries: () => client.get("/locations/countries/").then((response) => response.data),
  getProvinces: (countryId) => client.get("/locations/provinces/", { params: { country_id: countryId } }).then((response) => response.data),
  getCities: (provinceId) => client.get("/locations/cities/", { params: { province_id: provinceId } }).then((response) => response.data),
  getDistricts: (cityId) => client.get("/locations/districts/", { params: { city_id: cityId } }).then((response) => response.data),
  getWards: (provinceId) => client.get("/locations/wards/", { params: { province_id: provinceId } }).then((response) => response.data),
};

export default addressApi;
