export type CustomerProfile={id:string;fullName:string;phone:string;email:string;location:string;alternativePhone:string};
export type CustomerAccountResponse={profile:CustomerProfile;error?:string;message?:string};
export function cacheCustomerProfile(profile:CustomerProfile){
  // Device cache is a convenience only: all account/booking APIs verify the HttpOnly session.
  let changedAccount=false;
  try{
    const old=JSON.parse(localStorage.getItem('chill-pipe-profile') || '{}');
    if(old.id && old.id!==profile.id){
      changedAccount=true;
      localStorage.removeItem('chill-pipe-booking-access');
      sessionStorage.removeItem('chill-pipe-checkout-handoff');
      for(const key of ['chill-pipe-order','chill-pipe-draft'])localStorage.removeItem(key);
    }
    localStorage.setItem('chill-pipe-profile',JSON.stringify(profile));
  }catch{/* Storage can be disabled; the authenticated account remains usable. */}
  return changedAccount;
}
export function clearCustomerDevice(){
  try{['chill-pipe-profile','chill-pipe-booking-access','chill-pipe-order','chill-pipe-draft'].forEach(k=>localStorage.removeItem(k));sessionStorage.removeItem('chill-pipe-checkout-handoff');}catch{}
}
export function customerNext(value:string|null){return value==='/checkout'?'/checkout':'/my-bookings';}
