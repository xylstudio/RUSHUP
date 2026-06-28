declare module 'thai-address-database' {
  export type ThaiAddressItem = {
    district: string
    amphoe: string
    province: string
    zipcode: string
  }

  export function searchAddressByZipcode(query: string): ThaiAddressItem[]
  export function searchAddressByDistrict(query: string): ThaiAddressItem[]
  export function searchAddressByAmphoe(query: string): ThaiAddressItem[]
  export function searchAddressByProvince(query: string): ThaiAddressItem[]
}
