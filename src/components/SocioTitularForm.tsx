import React, { useState, ChangeEvent, FormEvent } from 'react';
import { User, Home, Search, CheckCircle, XCircle } from 'lucide-react';
import { SocioTitularRegistration, EconomicSituation } from '../types/form';
import { ECONOMIC_SITUATIONS } from '../data/constants';
import { supabase } from '../lib/supabaseClient';

const API_TOKEN = 'bee07ff13163585f6a0d648bf7c1b13b9a2d7b2591139e4acc267a6639eab891';
const API_URL = 'https://api.consultasperu.com/api/v1/query';

const initialFormData: SocioTitularRegistration = {
  nombres: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  edad: '',
  dni: '',
  direccionDNI: '',
  distritoDNI: '',
  provinciaDNI: '',
  regionDNI: '',
  fechaNacimiento: '',
  celular: '',
  localidad: '',
  direccionVivienda: '',
  mz: '',
  lote: '',
  ubicacionReferencia: '',
  distritoVivienda: '',
  provinciaVivienda: '',
  regionVivienda: '',
  situacionEconomica: 'Pobre',
};

// Helper para mapear nombres de campos a etiquetas legibles
const fieldLabels: Record<keyof SocioTitularRegistration, string> = {
  nombres: 'Nombres',
  apellidoPaterno: 'Apellido Paterno',
  apellidoMaterno: 'Apellido Materno',
  edad: 'Edad',
  dni: 'DNI',
  direccionDNI: 'Dirección (DNI)',
  distritoDNI: 'Distrito (DNI)',
  provinciaDNI: 'Provincia (DNI)',
  regionDNI: 'Región (DNI)',
  fechaNacimiento: 'Fecha de Nacimiento',
  celular: 'Celular',
  localidad: 'Localidad',
  direccionVivienda: 'Dirección (Vivienda)',
  mz: 'MZ (Manzana)',
  lote: 'Lote',
  ubicacionReferencia: 'Ubicación (Referencia)',
  distritoVivienda: 'Distrito (Vivienda)',
  provinciaVivienda: 'Provincia (Vivienda)',
  regionVivienda: 'Región (Vivienda)',
  situacionEconomica: 'Situación Económica',
};

const SocioTitularForm: React.FC = () => {
  const [formData, setFormData] = useState<SocioTitularRegistration>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingDni, setIsLoadingDni] = useState<boolean>(false);
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'housing'>('personal');
  const [dniFoundInSupabase, setDniFoundInSupabase] = useState<boolean | null>(null); // null: no search yet, true: found, false: not found
  const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false); // Nuevo estado para la modal

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseInt(value, 10) || 0) : value,
    }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    setSubmitMessage(null);
    // Reset DNI search status if DNI field is being changed
    if (name === 'dni') {
      setDniFoundInSupabase(null);
      setIsEditingExisting(false); // Assume new entry until confirmed
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombres) newErrors.nombres = 'Nombres es requerido.';
    if (!formData.apellidoPaterno) newErrors.apellidoPaterno = 'Apellido Paterno es requerido.';
    if (!formData.apellidoMaterno) newErrors.apellidoMaterno = 'Apellido Materno es requerido.';
    if (formData.edad === '') {
      newErrors.edad = 'Edad es requerida.';
    } else if (typeof formData.edad === 'number' && (formData.edad < 18 || formData.edad > 99)) {
      newErrors.edad = 'Edad debe ser entre 18 y 99.';
    }
    if (!/^\d{8}$/.test(formData.dni)) newErrors.dni = 'DNI debe ser 8 dígitos numéricos.';
    if (!formData.direccionDNI) newErrors.direccionDNI = 'Dirección de DNI es requerida.';
    if (!formData.distritoDNI) newErrors.distritoDNI = 'Distrito (DNI) es requerido.';
    if (!formData.provinciaDNI) newErrors.provinciaDNI = 'Provincia (DNI) es requerido.';
    if (!formData.regionDNI) newErrors.regionDNI = 'Región (DNI) es requerida.';
    if (!formData.localidad) newErrors.localidad = 'Localidad es requerida.';
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(formData.fechaNacimiento)) newErrors.fechaNacimiento = 'Fecha de Nacimiento debe ser DD/MM/YYYY.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const searchDniInSupabase = async (dni: string) => {
    if (!dni || dni.length !== 8) {
      setFormData(prev => ({ ...initialFormData, dni: prev.dni }));
      setIsEditingExisting(false);
      setDniFoundInSupabase(null);
      setSubmitMessage(null);
      return;
    }

    setIsLoadingDni(true);
    setSubmitMessage(null);

    try {
      const { data: dbData, error: dbError } = await supabase
        .from('socio_titulares')
        .select('*')
        .eq('dni', dni)
        .single();

      if (dbError && dbError.code !== 'PGRST116') { // PGRST116 significa "no rows found"
        throw dbError;
      }

      if (dbData) {
        setFormData(dbData);
        setIsEditingExisting(true);
        setDniFoundInSupabase(true);
        setSubmitMessage({ type: 'success', text: 'Datos existentes cargados para edición desde la base de datos.' });
      } else {
        setFormData(prev => ({ ...initialFormData, dni: prev.dni })); // Clear other fields, keep DNI
        setIsEditingExisting(false);
        setDniFoundInSupabase(false);
        setSubmitMessage({ type: 'warning', text: 'DNI no encontrado en la base de datos. Puedes consultar RENIEC.' });
      }
    } catch (error: any) {
      console.error('Error al buscar socio por DNI en Supabase:', error.message);
      setSubmitMessage({ type: 'error', text: `Error al buscar DNI en DB: ${error.message}` });
      setFormData(prev => ({ ...initialFormData, dni: prev.dni }));
      setIsEditingExisting(false);
      setDniFoundInSupabase(null); // Reset on error
    } finally {
      setIsLoadingDni(false);
    }
  };

  const searchDniInExternalApi = async (dni: string) => {
    if (!dni || dni.length !== 8) {
      setSubmitMessage({ type: 'error', text: 'Por favor, ingresa un DNI válido de 8 dígitos para consultar RENIEC.' });
      return;
    }

    setIsLoadingDni(true);
    setSubmitMessage(null);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          token: API_TOKEN,
          type_document: 'dni',
          document_number: dni,
        }),
      });

      const apiResponse = await response.json();
      console.log('Raw API Response from external API (RENIEC):', apiResponse);

      if (!apiResponse.success) {
        if (apiResponse.message === 'No data found') {
          setSubmitMessage({ type: 'warning', text: 'DNI no encontrado en RENIEC.' });
        } else {
          throw new Error(apiResponse.message || 'Error al consultar RENIEC');
        }
        setFormData(prev => ({ ...initialFormData, dni: prev.dni }));
        setIsEditingExisting(false);
        setDniFoundInSupabase(false); // Still not in Supabase
        return;
      }

      let dniFromApi = String(apiResponse.data.number);
      if (!/^\d{8}$/.test(dniFromApi)) {
        console.log('Invalid DNI from API:', dniFromApi);
        setSubmitMessage({ type: 'error', text: 'El DNI retornado por RENIEC no es válido.' });
        setFormData(prev => ({ ...prev, dni: '' }));
        setIsEditingExisting(false);
        setDniFoundInSupabase(false);
        return;
      }
			const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
      };
      const apiMappedData: Partial<SocioTitularRegistration> = {
        nombres: apiResponse.data.name || '',
        apellidoPaterno: apiResponse.data.surname?.split(' ')[0] || '',
        apellidoMaterno: apiResponse.data.surname?.split(' ')[1] || '',
        direccionDNI: apiResponse.data.address || '',
        distritoDNI: apiResponse.data.district || '',
        provinciaDNI: apiResponse.data.province || '',
        regionDNI: apiResponse.data.department || '',
        fechaNacimiento: formatDate(apiResponse.data.date_of_birth) || '',
        dni: dniFromApi,
        celular: '',
        localidad: '',
        edad: '',
        direccionVivienda: '',
        mz: '',
        lote: '',
        ubicacionReferencia: '',
        distritoVivienda: '',
        provinciaVivienda: '',
        regionVivienda: '',
        situacionEconomica: 'Pobre',
      };

      setFormData({
        ...initialFormData,
        ...apiMappedData,
        edad: apiMappedData.edad !== undefined ? apiMappedData.edad : initialFormData.edad,
        situacionEconomica: initialFormData.situacionEconomica,
      });
      setIsEditingExisting(false); // It's a new record for Supabase
      setDniFoundInSupabase(false); // Still not in Supabase
      setSubmitMessage({ type: 'warning', text: 'DNI encontrado en RENIEC. Registrando nuevo socio en la base de datos.' });

    } catch (error: any) {
      console.error('Error al consultar RENIEC:', error.message);
      setSubmitMessage({ type: 'error', text: `Error al consultar RENIEC: ${error.message}` });
      setFormData(prev => ({ ...initialFormData, dni: prev.dni }));
      setIsEditingExisting(false);
      setDniFoundInSupabase(false); // Still not in Supabase
    } finally {
      setIsLoadingDni(false);
    }
  };

  const handleDniBlur = () => {
    if (formData.dni && /^\d{8}$/.test(formData.dni)) {
      searchDniInSupabase(formData.dni);
    } else {
      setFormData(prev => ({ ...initialFormData, dni: prev.dni }));
      setIsEditingExisting(false);
      setDniFoundInSupabase(null);
      setSubmitMessage(null);
    }
  };

  // Nueva función para manejar la confirmación y el envío real
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setSubmitMessage(null); // Clear previous messages

    try {
      const dataToSubmit: Partial<SocioTitularRegistration> = {
        nombres: formData.nombres,
        apellidoPaterno: formData.apellidoPaterno,
        apellidoMaterno: formData.apellidoMaterno,
        edad: formData.edad === '' ? null : formData.edad,
        dni: formData.dni,
        direccionDNI: formData.direccionDNI,
        distritoDNI: formData.distritoDNI,
        provinciaDNI: formData.provinciaDNI,
        regionDNI: formData.regionDNI,
        fechaNacimiento: formData.fechaNacimiento,
        celular: formData.celular,
        localidad: formData.localidad,
        situacionEconomica: formData.situacionEconomica,
        direccionVivienda: formData.direccionVivienda,
        mz: formData.mz,
        lote: formData.lote,
        ubicacionReferencia: formData.ubicacionReferencia,
        distritoVivienda: formData.distritoVivienda,
        provinciaVivienda: formData.provinciaVivienda,
        regionVivienda: formData.regionVivienda,
      };

      for (const key in dataToSubmit) {
        const value = dataToSubmit[key as keyof typeof dataToSubmit];
        if (typeof value === 'string' && value.trim() === '') {
          (dataToSubmit as any)[key] = null;
        }
      }

      console.log('Payload being sent to Supabase:', dataToSubmit);

      let response;
      if (isEditingExisting) {
        response = await supabase
          .from('socio_titulares')
          .update(dataToSubmit)
          .eq('dni', formData.dni)
          .select();
      } else {
        response = await supabase
          .from('socio_titulares')
          .insert([dataToSubmit])
          .select();
      }

      const { data, error } = response;

      if (error) {
        throw error;
      }

      console.log('Formulario enviado y datos guardados en Supabase:', data);
      setSubmitMessage({ type: 'success', text: `Formulario ${isEditingExisting ? 'actualizado' : 'enviado'} con éxito y datos guardados.` });
      setShowConfirmationModal(false); // Cerrar modal al éxito
    } catch (error: any) {
      console.error('Error al enviar el formulario a Supabase:', error.message);
      setSubmitMessage({ type: 'error', text: `Error al guardar los datos: ${error.message}` });
      setShowConfirmationModal(false); // Cerrar modal también en caso de error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Modificado handleSubmit para mostrar la modal
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitMessage(null);
    if (!validateForm()) {
      setSubmitMessage({ type: 'error', text: 'Por favor, corrige los errores en el formulario.' });
      return;
    }
    setShowConfirmationModal(true); // Mostrar la modal de confirmación
  };

const renderInputField = (
    label: string,
    name: keyof SocioTitularRegistration,
    type: string = 'text',
    placeholder: string = '',
    pattern?: string,
    onBlurHandler?: () => void,
    isRequired: boolean = true
  ) => (
    <div className="mb-4">
      <label htmlFor={name} className="block text-textSecondary text-sm font-medium mb-2">
        {label} {isRequired ? <span className="text-error">*</span> : <span className="text-textSecondary text-opacity-70">(Opcional)</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          id={name}
          name={name}
          value={formData[name] as string | number}
          onChange={handleChange}
          onBlur={onBlurHandler}
          placeholder={placeholder}
          pattern={pattern}
          className={`w-full px-4 py-2 bg-surface border ${errors[name] ? 'border-error' : 'border-border'} rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200`}
          required={isRequired}
        />
        {name === 'dni' && isLoadingDni && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary text-sm">
            Buscando...
          </span>
        )}
      </div>
      {errors[name] && <p className="text-error text-xs mt-1">{errors[name]}</p>}
    </div>
  );

  const renderSummaryField = (label: string, value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') {
      return null; // No renderizar campos vacíos en el resumen
    }
    return (
      <div className="flex justify-between items-start py-2 border-b border-border last:border-b-0">
        <span className="font-medium text-textSecondary">{label}:</span>
        <span className="text-text text-right break-words ml-4">{String(value)}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-text font-sans">
      <header className="relative h-64 md:h-80 lg:h-96 flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-secondary shadow-lg">
        <img
          src="https://images.pexels.com/photos/3184433/pexels-photo-3184433.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          alt="Community building"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="relative z-10 text-center p-4">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white drop-shadow-lg leading-tight">
            Registro de Titular
          </h1>
          <p className="mt-2 text-lg md:text-xl text-white text-opacity-90 max-w-2xl mx-auto">
            Únete a nuestra comunidad. Completa el formulario para ser parte de nuestro programa.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <form onSubmit={handleSubmit} className="bg-surface p-8 md:p-12 rounded-2xl shadow-xl max-w-4xl mx-auto border border-border">
          <div className="mb-8 border-b border-border">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className={`px-6 py-3 text-lg font-semibold rounded-t-lg transition-all duration-200 ${
                  activeTab === 'personal'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-surface text-textSecondary hover:bg-surface/70'
                }`}
              >
                Datos Personales
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('housing')}
                className={`px-6 py-3 text-lg font-semibold rounded-t-lg transition-all duration-200 ${
                  activeTab === 'housing'
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-surface text-textSecondary hover:bg-surface/70'
                }`}
              >
                Datos de Vivienda
              </button>
            </div>
          </div>

          {activeTab === 'personal' && (
            <section className="mb-10 pb-8 animate-fade-in">
              <h2 className="text-3xl font-bold text-primary mb-6 flex items-center">
                <User className="mr-3 text-accent" size={32} /> Datos Personales
              </h2>

              {/* Opciones de búsqueda de DNI */}
              <div className="mb-4">
                <label className="block text-textSecondary text-sm font-medium mb-2">
                  Opciones de búsqueda de DNI:
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => searchDniInSupabase(formData.dni)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      dniFoundInSupabase === true
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-surface text-textSecondary hover:bg-surface/70'
                    }`}
                    disabled={isLoadingDni || !formData.dni || !/^\d{8}$/.test(formData.dni)}
                  >
                    Buscar en Base de Datos
                  </button>

                  {dniFoundInSupabase === false && (
                    <button
                      type="button"
                      onClick={() => searchDniInExternalApi(formData.dni)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        isLoadingDni ? 'bg-gray-600' : 'bg-accent text-white shadow-md hover:bg-accent/90'
                      }`}
                      disabled={isLoadingDni || !formData.dni || !/^\d{8}$/.test(formData.dni)}
                    >
                      Consultar RENIEC
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderInputField('DNI', 'dni', 'text', 'Ej: 12345678', '\\d{8}', handleDniBlur)}
                {renderInputField('Nombres', 'nombres', 'text', 'Ej: Juan Carlos')}
                {renderInputField('Apellido Paterno', 'apellidoPaterno', 'text', 'Ej: García')}
                {renderInputField('Apellido Materno', 'apellidoMaterno', 'text', 'Ej: Pérez')}
                {renderInputField('Fecha de Nacimiento', 'fechaNacimiento', 'text', 'DD/MM/YYYY', '\\d{2}/\\d{2}/\\d{4}')}
                {renderInputField('Edad', 'edad', 'number', 'Ej: 35')}
                {renderInputField('Localidad', 'localidad', 'text', 'Ej: San Juan')}
                {renderInputField('Dirección de DNI', 'direccionDNI', 'text', 'Ej: Av. Los Girasoles 123')}
                {renderInputField('Región (DNI)', 'regionDNI', 'text', 'Ej: Lima')}
                {renderInputField('Provincia (DNI)', 'provinciaDNI', 'text', 'Ej: Lima')}
                {renderInputField('Distrito (DNI)', 'distritoDNI', 'text', 'Ej: Miraflores')}
                {renderInputField('Celular', 'celular', 'text', 'Ej: 987654321', '\\d{9}', undefined, false)}
              </div>
            </section>
          )}

          {activeTab === 'housing' && (
            <section className="mb-10 pb-8 animate-fade-in">
              <h2 className="text-3xl font-bold text-primary mb-6 flex items-center">
                <Home className="mr-3 text-accent" size={32} /> Datos de Instalación de Vivienda
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderInputField('Dirección (Vivienda)', 'direccionVivienda', 'text', 'Ej: Calle Las Flores 456', undefined, undefined, false)}
                {renderInputField('MZ (Manzana)', 'mz', 'text', 'Ej: A', undefined, undefined, false)}
                {renderInputField('Lote', 'lote', 'text', 'Ej: 15', undefined, undefined, false)}
                {renderInputField('Ubicación (Referencia)', 'ubicacionReferencia', 'text', 'Ej: Frente al parque', undefined, undefined, false)}
                {renderInputField('Región (Vivienda)', 'regionVivienda', 'text', 'Ej: Lima', undefined, undefined, false)}
                {renderInputField('Provincia (Vivienda)', 'provinciaVivienda', 'text', 'Ej: Lima', undefined, undefined, false)}
                {renderInputField('Distrito (Vivienda)', 'distritoVivienda', 'text', 'Ej: San Juan de Lurigancho', undefined, undefined, false)}
              </div>
            </section>
          )}

          <section className="mb-10 pb-8 border-b border-border animate-fade-in delay-100">
            <h2 className="text-3xl font-bold text-primary mb-6 flex items-center">
              Situación Económica
            </h2>
            <div className="mb-6">
              <label className="block text-textSecondary text-sm font-medium mb-2">
                Situación Económica
              </label>
              <div className="flex flex-wrap gap-4">
                {ECONOMIC_SITUATIONS.map(option => (
                  <label key={option.value} className="inline-flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="situacionEconomica"
                      value={option.value}
                      checked={formData.situacionEconomica === option.value}
                      onChange={handleChange}
                      className="form-radio h-5 w-5 text-primary border-border bg-surface focus:ring-primary transition-colors duration-200"
                    />
                    <span className="ml-2 text-text">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {submitMessage && (
            <div className={`mb-4 p-4 rounded-lg text-center ${
              submitMessage.type === 'success' ? 'bg-success/20 text-success' :
              submitMessage.type === 'warning' ? 'bg-warning/20 text-warning' :
              'bg-error/20 text-error'
            }`}>
              {submitMessage.text}
            </div>
          )}
          <div className="flex justify-end animate-fade-in delay-300">
            <button
              type="submit"
              className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoadingDni} // isSubmitting se controla en la modal
            >
              {isEditingExisting ? 'Actualizar Socio Titular' : 'Registrar Socio Titular'}
            </button>
          </div>
        </form>
      </main>

      {/* Modal de Confirmación */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface p-8 rounded-2xl shadow-2xl max-w-2xl w-full border border-border transform scale-95 animate-scale-in">
            <h3 className="text-3xl font-bold text-primary mb-6 text-center flex items-center justify-center">
              <CheckCircle className="mr-3 text-accent" size={32} /> Confirmar Datos
            </h3>
            <p className="text-textSecondary text-center mb-6">
              Por favor, revisa los datos ingresados antes de confirmar.
            </p>

            <div className="max-h-96 overflow-y-auto pr-4 mb-6 custom-scrollbar">
              <div className="mb-6">
                <h4 className="text-xl font-semibold text-text mb-3 flex items-center">
                  <User className="mr-2 text-primary" size={20} /> Datos Personales
                </h4>
                {renderSummaryField(fieldLabels.nombres, formData.nombres)}
                {renderSummaryField(fieldLabels.apellidoPaterno, formData.apellidoPaterno)}
                {renderSummaryField(fieldLabels.apellidoMaterno, formData.apellidoMaterno)}
                {renderSummaryField(fieldLabels.dni, formData.dni)}
                {renderSummaryField(fieldLabels.fechaNacimiento, formData.fechaNacimiento)}
                {renderSummaryField(fieldLabels.edad, formData.edad)}
                {renderSummaryField(fieldLabels.celular, formData.celular)}
                {renderSummaryField(fieldLabels.localidad, formData.localidad)}
                {renderSummaryField(fieldLabels.direccionDNI, formData.direccionDNI)}
                {renderSummaryField(fieldLabels.distritoDNI, formData.distritoDNI)}
                {renderSummaryField(fieldLabels.provinciaDNI, formData.provinciaDNI)}
                {renderSummaryField(fieldLabels.regionDNI, formData.regionDNI)}
              </div>

              <div className="mb-6">
                <h4 className="text-xl font-semibold text-text mb-3 flex items-center">
                  <Home className="mr-2 text-primary" size={20} /> Datos de Vivienda
                </h4>
                {renderSummaryField(fieldLabels.direccionVivienda, formData.direccionVivienda)}
                {renderSummaryField(fieldLabels.mz, formData.mz)}
                {renderSummaryField(fieldLabels.lote, formData.lote)}
                {renderSummaryField(fieldLabels.ubicacionReferencia, formData.ubicacionReferencia)}
                {renderSummaryField(fieldLabels.distritoVivienda, formData.distritoVivienda)}
                {renderSummaryField(fieldLabels.provinciaVivienda, formData.provinciaVivienda)}
                {renderSummaryField(fieldLabels.regionVivienda, formData.regionVivienda)}
              </div>

              <div>
                <h4 className="text-xl font-semibold text-text mb-3 flex items-center">
                  <Search className="mr-2 text-primary" size={20} /> Situación Económica
                </h4>
                {renderSummaryField(fieldLabels.situacionEconomica, ECONOMIC_SITUATIONS.find(e => e.value === formData.situacionEconomica)?.label || formData.situacionEconomica)}
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-8">
              <button
                type="button"
                onClick={() => setShowConfirmationModal(false)}
                className="px-6 py-3 bg-textSecondary text-white font-bold rounded-xl shadow-md hover:bg-textSecondary/80 focus:outline-none focus:ring-4 focus:ring-textSecondary/50 transition-all duration-300 transform hover:scale-105"
                disabled={isSubmitting}
              >
                <XCircle className="inline-block mr-2" size={20} /> Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/50 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? (isEditingExisting ? 'Actualizando...' : 'Enviando...')
                  : (isEditingExisting ? 'Confirmar Actualización' : 'Confirmar Registro')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocioTitularForm;
