data = {
  ...apiResponse.data,
  nombres: apiResponse.data.name,
  apellidoPaterno: apiResponse.data.surname.split(' ')[0],
  apellidoMaterno: apiResponse.data.surname.split(' ')[1] || '',
  direccionDNI: apiResponse.data.address, // This line was correct
  distritoDNI: apiResponse.data.district,
  provinciaDNI: apiResponse.data.province,
  regionDNI: apiResponse.data.department,
  fechaNacimiento: apiResponse.data.date_of_birth,
  dni: dniFromApi, // Use the validated DNI
};
