const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setSubmitMessage(null);
  if (!validateForm()) {
    setSubmitMessage({ type: 'error', text: 'Por favor, corrige los errores en el formulario.' });
    return;
  }

  setIsSubmitting(true);
  try {
    // Map form data to match Supabase column names
    const dataToSubmit = {
      ...formData,
      edad: formData.edad === '' ? null : formData.edad,
      direccion_dni: formData.direccionDNI, // Map direccionDNI to direccion_dni
      // ... other mappings if necessary
    };

    delete dataToSubmit.direccionDNI; // Remove the original field

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
