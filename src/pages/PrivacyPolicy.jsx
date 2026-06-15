import React from "react";
import { Helmet } from "react-helmet-async";

const LAST_UPDATED = "14 de junio de 2026";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Helmet>
        <title>Política de Privacidad | JuarezBravo.com</title>
        <meta
          name="description"
          content="Política de privacidad de JuarezBravo.com — cómo recopilamos, usamos y protegemos la información de nuestros lectores."
        />
      </Helmet>

      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
        JuarezBravo.com
      </div>

      <h1 className="font-serif font-bold text-3xl sm:text-4xl leading-tight mb-2">
        Política de Privacidad
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Última actualización: {LAST_UPDATED}
      </p>

      <div className="prose prose-lg max-w-none prose-headings:font-serif prose-a:text-primary">
        <p>
          En <strong>JuarezBravo.com</strong> (en adelante, "el Sitio"), respetamos
          la privacidad de nuestros lectores. Esta Política describe qué información
          recopilamos, cómo la utilizamos y los derechos que tienes sobre ella.
          Al acceder o utilizar el Sitio, aceptas las prácticas descritas a
          continuación.
        </p>

        <h2>1. Responsable del tratamiento</h2>
        <p>
          El responsable del tratamiento de los datos recopilados a través del Sitio
          es el equipo editorial de JuarezBravo.com, con sede en Ciudad Juárez,
          Chihuahua, México. Para cualquier consulta relacionada con esta Política,
          puedes contactarnos al correo{" "}
          <a href="mailto:contacto@juarez-bravo.com">contacto@juarez-bravo.com</a>.
        </p>

        <h2>2. Información que recopilamos</h2>
        <p>
          El Sitio está diseñado para consultarse de forma anónima. La información
          que podemos recopilar incluye:
        </p>
        <ul>
          <li>
            <strong>Datos de navegación:</strong> tipo de navegador, sistema
            operativo, páginas visitadas, tiempo de permanencia, dirección IP
            aproximada y referrer, recopilados con fines estadísticos.
          </li>
          <li>
            <strong>Cookies técnicas:</strong> pequeños archivos almacenados en tu
            dispositivo que permiten el funcionamiento básico del Sitio.
          </li>
          <li>
            <strong>Datos del panel administrativo:</strong> solo el personal
            editorial autorizado introduce credenciales (usuario y contraseña) para
            publicar contenido; estos datos no se relacionan con visitantes
            externos.
          </li>
        </ul>
        <p>
          No solicitamos ni almacenamos información personal sensible (nombre,
          dirección, teléfono, datos financieros) de los lectores, salvo cuando
          decidas enviarnos un mensaje voluntariamente.
        </p>

        <h2>3. Cómo utilizamos la información</h2>
        <p>Usamos la información recopilada exclusivamente para:</p>
        <ul>
          <li>Operar y mantener el Sitio.</li>
          <li>Entender qué contenidos resultan más útiles para nuestros lectores.</li>
          <li>Mejorar el rendimiento técnico y la experiencia de lectura.</li>
          <li>Cumplir obligaciones legales cuando corresponda.</li>
        </ul>

        <h2>4. Cookies y tecnologías similares</h2>
        <p>
          El Sitio utiliza cookies estrictamente necesarias para su funcionamiento
          (por ejemplo, mantener tu sesión en el panel administrativo). Puedes
          configurar tu navegador para bloquear o eliminar cookies; ten en cuenta
          que esto puede afectar la funcionalidad del Sitio.
        </p>

        <h2>5. Servicios de terceros</h2>
        <p>
          Para ofrecer nuestro servicio integramos con plataformas externas que
          tienen sus propias políticas de privacidad:
        </p>
        <ul>
          <li>
            <strong>Meta / Facebook:</strong> publicamos automáticamente enlaces a
            nuestras noticias en nuestra Página de Facebook. La interacción con
            esas publicaciones se rige por la{" "}
            <a
              href="https://www.facebook.com/privacy/policy/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Política de Privacidad de Meta
            </a>
            .
          </li>
          <li>
            <strong>OpenAI:</strong> utilizamos modelos de inteligencia artificial
            para reescribir y resumir contenidos noticiosos de dominio público.
            No enviamos información personal de visitantes a estos servicios.
          </li>
          <li>
            <strong>Proveedor de hosting:</strong> el Sitio se aloja en servidores
            de Hostinger, que aplican sus propias medidas de seguridad y
            privacidad.
          </li>
        </ul>

        <h2>6. Conservación de la información</h2>
        <p>
          Los datos de navegación se conservan solo durante el tiempo necesario
          para los fines descritos en esta Política, salvo que la ley exija un
          plazo mayor.
        </p>

        <h2>7. Tus derechos (ARCO)</h2>
        <p>
          De conformidad con la Ley Federal de Protección de Datos Personales en
          Posesión de los Particulares (México), tienes derecho a Acceder,
          Rectificar, Cancelar u Oponerte (derechos ARCO) al tratamiento de tus
          datos personales. Puedes ejercerlos enviando una solicitud al correo{" "}
          <a href="mailto:contacto@juarez-bravo.com">contacto@juarez-bravo.com</a>{" "}
          indicando tu nombre, el derecho que deseas ejercer y la información
          relacionada.
        </p>

        <h2>8. Seguridad</h2>
        <p>
          Implementamos medidas técnicas razonables (HTTPS, autenticación segura,
          actualizaciones del servidor) para proteger la información que viaja por
          el Sitio. Sin embargo, ningún sistema en internet es completamente
          inviolable; te recomendamos mantener tus propios dispositivos seguros.
        </p>

        <h2>9. Menores de edad</h2>
        <p>
          El Sitio está dirigido a un público general adulto. No recopilamos
          conscientemente información de menores de edad. Si crees que un menor nos
          ha enviado datos personales, contáctanos para eliminarlos.
        </p>

        <h2>10. Cambios a esta Política</h2>
        <p>
          Podemos actualizar esta Política para reflejar cambios legales,
          tecnológicos o de operación. La fecha de la última actualización se
          indica al inicio del documento. Te recomendamos revisarla periódicamente.
        </p>

        <h2>11. Contacto</h2>
        <p>
          Si tienes dudas, comentarios o quejas sobre esta Política, escríbenos a{" "}
          <a href="mailto:contacto@juarez-bravo.com">contacto@juarez-bravo.com</a>.
          Atendemos cada solicitud dentro de plazos razonables.
        </p>
      </div>
    </div>
  );
}
