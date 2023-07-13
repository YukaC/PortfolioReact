import React from 'react';

const DownloadButton = () => {
  const handleDownload = () => {
    // Nombre del archivo que quieres descargar
    const fileName = 'Agustin-Ciucani-Resume.pdf';

    // URL del archivo (sin incluir "public")
    const fileUrl = '/' + fileName;

    // Crea un elemento <a> invisible
    const link = document.createElement('a');
    link.href = fileUrl;
    link.target = '_blank';
    link.download = fileName; // Nombre del archivo que se descargará

    // Agrega el elemento <a> al DOM y haz clic en él
    document.body.appendChild(link);
    link.click();

    // Limpia el elemento <a> del DOM después de la descarga
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleDownload}
      className="w-32 px-4 py-2 text-white transition-all duration-200 rounded-md cursor-pointer bg-main-color hover:bg-shadow-main-color"
    >
      Download
    </button>
  );
};

export default DownloadButton;
