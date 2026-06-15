import React from "react";
import { Helmet } from "react-helmet-async";

const LAST_UPDATED = "14 de junio de 2026";

export default function TermsOfService() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Helmet>
        <title>Términos del Servicio | JuarezBravo.com</title>
        <meta
          name="description"
          content="Términos y condiciones de uso del portal de noticias JuarezBravo.com."
        />
      </Helmet>

      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
        JuarezBravo.com
      </div>

      <h1 className="font-serif font-bold text-3xl sm:text-4xl leading-tight mb-2">
        Términos del Servicio
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Última actualización: {LAST_UPDATED}
      </p>

      <div className="prose prose-lg max-w-none prose-headings:font-serif prose-a:text-primary">
        <p>
          Estos Términos del Servicio (en adelante, los "Términos") regulan el
          acceso y uso del sitio web <strong>JuarezBravo.com</strong> (en
          adelante, el "Sitio"). Al utilizar el Sitio aceptas estos Términos en su
          totalidad. Si no estás de acuerdo, te pedimos abstenerte de usarlo.
        </p>

        <h2>1. Sobre el Sitio</h2>
        <p>
          JuarezBravo.com es un portal informativo independiente dedicado a la
          cobertura de noticias de Ciudad Juárez, Chihuahua, México. Publicamos
          contenido sobre seguridad, política, sociedad, deportes y
          entretenimiento. El Sitio se ofrece "tal cual", sin garantías de
          disponibilidad ininterrumpida.
        </p>

        <h2>2. Uso permitido</h2>
        <p>Al utilizar el Sitio te comprometes a:</p>
        <ul>
          <li>Usarlo con fines lícitos y conforme a la legislación aplicable.</li>
          <li>
            No intentar acceder a áreas restringidas, alterar el funcionamiento
            del Sitio, ni realizar ingeniería inversa de sus sistemas.
          </li>
          <li>
            No utilizar herramientas automatizadas (scraping masivo, bots) que
            puedan afectar el rendimiento del servicio para otros usuarios.
          </li>
          <li>
            No publicar comentarios o enviar comunicaciones que constituyan
            difamación, incitación al odio, discriminación o cualquier conducta
            ilegal.
          </li>
        </ul>

        <h2>3. Propiedad intelectual</h2>
        <p>
          Todos los textos editoriales, identidad visual, diseño, código fuente y
          elementos originales del Sitio son propiedad de JuarezBravo.com o se
          utilizan bajo licencia. Queda prohibida su reproducción total o parcial
          sin autorización previa por escrito, salvo en los siguientes casos:
        </p>
        <ul>
          <li>
            Citas breves con fines informativos, siempre que se mencione la
            fuente y se incluya un enlace al artículo original.
          </li>
          <li>Compartir enlaces a los artículos en redes sociales.</li>
        </ul>
        <p>
          Las imágenes y contenidos provenientes de terceros se utilizan bajo
          licencias correspondientes o al amparo del derecho de cita. Si
          consideras que algún material vulnera tus derechos, escríbenos a{" "}
          <a href="mailto:contacto@juarez-bravo.com">contacto@juarez-bravo.com</a>{" "}
          para revisarlo a la brevedad.
        </p>

        <h2>4. Contenido y línea editorial</h2>
        <p>
          Nuestro contenido se elabora con base en fuentes públicas y verificadas
          al momento de la publicación. En algunos casos utilizamos herramientas
          de inteligencia artificial para reescribir, resumir o reformular
          información de dominio público, siempre bajo supervisión editorial.
          Las opiniones expresadas en columnas o artículos firmados pertenecen a
          sus autores y no necesariamente representan la postura del Sitio.
        </p>

        <h2>5. Enlaces a sitios de terceros</h2>
        <p>
          El Sitio puede contener enlaces a páginas administradas por terceros.
          No nos responsabilizamos por el contenido, prácticas o políticas de
          esos sitios. Recomendamos revisar sus términos y políticas de
          privacidad de manera independiente.
        </p>

        <h2>6. Redes sociales</h2>
        <p>
          Mantenemos presencia en plataformas como Facebook, X (Twitter),
          Instagram y otras. El uso de esas plataformas se rige por los términos
          de cada una. Al interactuar con nuestras publicaciones aceptas también
          las condiciones de la red social correspondiente.
        </p>

        <h2>7. Limitación de responsabilidad</h2>
        <p>
          JuarezBravo.com no será responsable por:
        </p>
        <ul>
          <li>
            Decisiones tomadas con base en la información publicada en el Sitio.
          </li>
          <li>
            Interrupciones del servicio derivadas de fallas técnicas, ataques
            informáticos, mantenimiento o caso fortuito.
          </li>
          <li>
            Daños indirectos, consecuenciales o lucro cesante derivados del uso
            del Sitio.
          </li>
        </ul>
        <p>
          La información publicada tiene carácter periodístico, no profesional
          especializado (legal, médico, financiero). Para decisiones importantes
          recomendamos consultar fuentes oficiales o profesionales calificados.
        </p>

        <h2>8. Cuentas administrativas</h2>
        <p>
          El acceso al panel administrativo está restringido al equipo editorial.
          Si tienes acceso a una cuenta de este tipo, eres responsable de mantener
          la confidencialidad de tus credenciales y de cualquier actividad
          realizada bajo ellas.
        </p>

        <h2>9. Modificaciones</h2>
        <p>
          Podemos modificar estos Términos en cualquier momento. Las
          actualizaciones se publicarán en esta misma página con la fecha
          correspondiente. El uso continuado del Sitio tras una modificación
          implica la aceptación de los Términos actualizados.
        </p>

        <h2>10. Legislación aplicable y jurisdicción</h2>
        <p>
          Estos Términos se rigen por las leyes vigentes de los Estados Unidos
          Mexicanos. Para cualquier controversia derivada de su interpretación o
          ejecución, las partes se someten a la jurisdicción de los tribunales
          competentes de Ciudad Juárez, Chihuahua, México, renunciando a
          cualquier otro fuero que pudiera corresponderles.
        </p>

        <h2>11. Contacto</h2>
        <p>
          Si tienes preguntas sobre estos Términos, escríbenos a{" "}
          <a href="mailto:contacto@juarez-bravo.com">contacto@juarez-bravo.com</a>
          . Atenderemos cada solicitud en plazos razonables.
        </p>
      </div>
    </div>
  );
}
