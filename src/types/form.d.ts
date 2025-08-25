export type EconomicSituation = 'Pobre' | 'Extremo Pobre'; // Updated: Only two options

export interface SocioTitularRegistration {
  // 1. Personal Information (Datos Personales)
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  edad: number;
  dni: string;
  direccionDNI: string;
  distritoDNI: string;
  provinciaDNI: string;
  regionDNI: string;
  fechaNacimiento: string;
  celular: string;

  // 2. Housing Installation Information (Datos de Instalación de Vivienda) - Ahora opcionales
  direccionVivienda?: string;
  mz?: string;
  lote?: string;
  ubicacionReferencia?: string;
  localidad?: string;
  distritoVivienda?: string;
  provinciaVivienda?: string;
  regionVivienda?: string;

  // 3. Economic Situation of the Socio Titular (Situación Económica del Socio Titular)
  situacionEconomica: EconomicSituation;
}
