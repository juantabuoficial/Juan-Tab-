/** Solo prepara datos ficticios en los emuladores locales. Nunca accede a Google Cloud. */
import { FIRESTORE_DATABASE_ID } from '../src/services/firebasePublicConfig.ts';
if(process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085')throw new Error('Requiere el emulador local de Firestore.');
const project='demo-planifica';
const authUrl='http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-only';
const response=await fetch(authUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@planifica.test',password:'Prueba-local-2026!',returnSecureToken:true})});
const account=await response.json();
if(!account.localId)throw new Error('No se ha podido preparar la identidad del emulador.');
const uid=account.localId;
function value(v){
 if(v===null)return {nullValue:null};
 if(typeof v==='boolean')return {booleanValue:v};
 if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};
 if(typeof v==='string')return {stringValue:v};
 if(Array.isArray(v))return {arrayValue:{values:v.map(value)}};
 return {mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,value(x)]))}};
}
async function seed(path,data){
 const url=`http://127.0.0.1:8085/v1/projects/${project}/databases/${FIRESTORE_DATABASE_ID}/documents/${path}`;
 const res=await fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},body:JSON.stringify({fields:Object.fromEntries(Object.entries(data).map(([k,v])=>[k,value(v)]))})});
 if(!res.ok)throw new Error(`No se ha preparado ${path}: ${res.status}`);
}
const user={id:uid,nombre:'Administración',apellidos:'de prueba',email:'admin@planifica.test',rol:'administrador',activo:true,departamento:'Pruebas locales',cargo:'Administrador de prueba',biometriaHabilitada:false,dosFactoresHabilitado:false};
await seed(`usuarios/${uid}`,user);
const {email,biometriaHabilitada,dosFactoresHabilitado,...directory}=user;
await seed(`directorioPersonal/${uid}`,directory);
await seed('planes/plan-prueba',{id:'plan-prueba',codigo:'PRUEBA-2026',nombre:'Plan de prueba local',ejercicio:2026,plazoEjecucionMaximo:'2026-12-31',plazoJustificacionMaximo:'2027-01-31',eellBeneficiarias:['Cádiz'],actuacionesPrevistas:[],presupuestoTotal:100000,fechaCreacion:'2026-10-21T00:00:00Z',activo:true});
console.log('Emuladores preparados con datos ficticios; proyecto remoto intacto.');
