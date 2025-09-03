export type EconomicSituation = 'Pobre' | 'Pobre Extremo' | 'No Pobre';

export interface SocioTitularRegistration {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  edad: number | ''; // Permitir cadena vacía para la edad
  dni: string;
  direccionDNI: string;
  distritoDNI: string;
  provinciaDNI: string;
  regionDNI: string;
  fechaNacimiento: string;
  celular: string;
  localidad: string;
  direccionVivienda?: string;
  mz?: string;
  lote?: string;
  ubicacionReferencia?: string;
  distritoVivienda?: string;
  provinciaVivienda?: string;
  regionVivienda?: string;
  situacionEconomica: EconomicSituation;
}
