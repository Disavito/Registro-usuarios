import React, { useState, ChangeEvent, FormEvent } from 'react';
import { User, Home, Search } from 'lucide-react';
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

const SocioTitularForm: React.FC = () => {
  const [formData, setFormData] = useState<SocioTitularRegistration>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingDni, setIsLoadingDni] = useState<boolean>(false);
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'personal' | 'housing'>('personal');
  const [searchType, setSearchType] = useState<'db' | 'api'>('api'); // 'db' or 'api'

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

  const fetchSocioByDni = async (dni: string) => {
    if (!dni || dni.length !== 8) {
      setFormData(prev => ({ ...initialFormData, dni: prev.dni }));
      setIsEditingExisting(false);
      setSubmitMessage(null);
      return;
    }

    setIsLoadingDni(true);
    setSubmitMessage(null);
    try {
      let data;
      if (searchType === 'db') {
        // Buscar en la base de datos Supabase
        const { data: dbData, error } = await supabase
          .from('socio_titulares')
          .select('*')
          .eq('dni', dni)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        data = dbData;
      } else {
        // Buscar en la API
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json', // Add Accept header
          },
          body: JSON.stringify({
            token: API_TOKEN,
            type_document: 'dni',
            document_number: dni,
          }),
        });

        const apiResponse = await response.json();

        if (!apiResponse.success) {
          if (apiResponse.message === 'No data found') {
            data = null; // No se encontraron datos en la API
          } else {
            throw new Error(apiResponse.message || 'Error al buscar en la API');
          }
        } else {
          // Format DNI to 8 digits if it's not already
          let dniFromApi = apiResponse.data.dni || apiResponse.data.document_number;

          // Ensure dniFromApi is a string
          dniFromApi = String(dniFromApi);

          // Validate DNI from API
          if (!/^\d{8}$/.test(dniFromApi)) {
            setSubmitMessage({ type: 'error', text: 'El DNI retornado por la API no es válido.' });
            setFormData(prev => ({ ...prev, dni: '' })); // Clear the DNI field
            setIsEditingExisting(false);
            return;
          }

          data = {
            ...apiResponse.data,
            nombres: apiResponse.data.name,
            apellidoPaterno: apiResponse.data.surname.split(' ')[0],
            apellidoMaterno: apiResponse.data.surname.split(' ')[1] || '',
            direccionDNI: apiResponse.data.address,
            distritoDNI: apiResponse.data.district,
            provinciaDNI: apiResponse.data.province,
            regionDNI: apiResponse.data.department,
            fechaNacimiento: apiResponse.data.date_of_birth,
            dni: dniFromApi, // Use the validated DNI
          };
        }
      }

      if (data) {
        // Datos encontrados, pre-llenar el formulario
        setFormData(data);
        setIsEditingExisting(true);
        setSubmitMessage({ type: 'success', text: 'Datos existentes cargados para edición.' });
      } else {
        // No se encontraron datos, limpiar otros campos pero mantener el DNI, preparar para nuevo registro
        setFormData(prev => ({ ...initialFormData, dni: prev.dni }));
        setIsEditingExisting(false);
        setSubmitMessage({ type: 'warning', text: 'DNI no encontrado. Registrando nuevo socio.' });
      }
    } catch (error: any) {
      console.error('Error al buscar socio por DNI:', error.message);
      setSubmitMessage({ type: 'error', text: `Error al buscar DNI: ${error.message}` });
      setFormData(prev => ({ ...initialFormData, dni: prev.dni }));
      setIsEditingExisting(false);
    } finally {
      setIsLoadingDni(false);
    }
  };

  const handleDniBlur = () => {
    if (formData.dni && /^\d{8}$/.test(formData.dni)) {
      fetchSocioByDni(formData.dni);
    } else {
      setFormData(prev => ({ ...initialFormData, dni: prev.dni }));
      setIsEditingExisting(false);
      setSubmitMessage(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitMessage(null);
    if (!validateForm()) {
      setSubmitMessage({ type: 'error', text: 'Por favor, corrige los errores en el formulario.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const dataToSubmit = {
        ...formData,
        edad: formData.edad === '' ? null : formData.edad,
      };

      let response;
      if (isEditingExisting) {
        response = await supabase
          .from('socio_titulares')
          .update(dataToSubmit)
          .eq('dni', formData.dni);
      } else {
        response = await supabase
          .from('socio_titulares')
          .insert([dataToSubmit]);
      }

      const { data, error } = response;

      if (error) {
        throw error;
      }

      console.log('Formulario enviado y datos guardados en Supabase:', data);
      setSubmitMessage({ type: 'success', text: `Formulario ${isEditingExisting ? 'actualizado' : 'enviado'} con éxito y datos guardados.` });
    } catch (error: any) {
      console.error('Error al enviar el formulario a Supabase:', error.message);
      setSubmitMessage({ type: 'error', text: `Error al guardar los datos: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <div className="min-h-screen bg-background text-text font-sans">
      <header className="relative h-64 md:h-8```xml
0 lg:h-96 flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-secondary shadow-lg">
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

              {/* Selector de tipo de búsqueda */}
              <div className="mb-4">
                <label className="block text-textSecondary text-sm font-medium mb-2">
                  Buscar DNI en:
                </label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setSearchType('db')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      searchType === 'db'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-surface text-textSecondary hover:bg-surface/70'
                    }`}
                  >
                    Base de Datos
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchType('api')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      searchType === 'api'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-surface text-textSecondary hover:bg-surface/70'
                    }`}
                  >
                    API
                  </button>
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
              disabled={isSubmitting || isLoadingDni}
            >
              {isSubmitting
                ? (isEditingExisting ? 'Actualizando...' : 'Enviando...')
                : (isEditingExisting ? 'Actualizar Socio Titular' : 'Registrar Socio Titular')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default SocioTitularForm;
</boltAction>
</boltArtifact>
