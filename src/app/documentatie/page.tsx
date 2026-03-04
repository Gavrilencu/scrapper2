'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function DocumentatiePage() {
  return (
    <div className="p-8 max-w-4xl">
      <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-8">
        <ArrowLeft className="h-4 w-4" /> Înapoi
      </Link>
      <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
        <BookOpen className="h-8 w-8" /> Documentație Scrapper Pro
      </h1>
      <p className="text-slate-400 mb-10">Descriere, funcționare și ghid de utilizare.</p>

      <div className="space-y-10 text-slate-300">
        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3">1. Ce este Scrapper Pro?</h2>
          <p className="mb-3">
            Scrapper Pro este o aplicație care extrage date din pagini web, le verifică (opțional) față de baza de date și le inserează în baze de date Oracle. Poți defini job-uri care rulează la ore fixe (zilnic, săptămânal sau la fiecare N ore) și poți primi notificări pe email la succes sau la eroare.
          </p>
          <p>
            Utilizări tipice: sincronizare prețuri/produse de pe site-uri în baza internă, colectare date din tabele HTML, monitorizare pagini cu notificări la schimbări.
          </p>
        </section>

        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3">2. Cum funcționează (fluxul general)</h2>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Definiți <strong className="text-white">conexiuni</strong> la baze de date Oracle (host, port, service name, user, parolă).</li>
            <li>Opțional: configurați <strong className="text-white">email</strong> (SMTP/Exchange) pentru notificări.</li>
            <li>Creați un <strong className="text-white">job</strong>: îi dați un URL, îi asociați o conexiune și setați cum se extrag datele (tabele detectate automat sau XPath/CSS → variabile).</li>
            <li>În job puteți defini un <strong className="text-white">script de verificare</strong> (opțional): dacă este activat și returnează COUNT &gt; 0, rândul nu se inserează; dacă COUNT = 0 sau verificarea este dezactivată, se rulează scriptul de inserare.</li>
            <li>Scriptul de <strong className="text-white">inserare</strong> folosește variabilele extrase cu sintaxa <code className="bg-surface-light px-1 rounded">{`{{nume_variabilă}}`}</code>.</li>
            <li>Job-ul rulează conform <strong className="text-white">programării</strong> (zilnic, săptămânal, la N ore). Puteți și „Rulează acum” din listă.</li>
          </ol>
        </section>

        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3">3. Prima utilizare (pași rapizi)</h2>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>La prima accesare veți fi redirecționat la <strong className="text-white">Configurare inițială</strong>: setați utilizatorul și parola de administrator.</li>
            <li>După aceea, la fiecare acces veți introduce acest utilizator și parola pe pagina de <strong className="text-white">Login</strong>.</li>
            <li>Meniul principal: <Link href="/" className="text-brand-400 hover:underline">Dashboard</Link>, <Link href="/connections" className="text-brand-400 hover:underline">Conexiuni DB</Link>, <Link href="/jobs" className="text-brand-400 hover:underline">Job-uri</Link>, <Link href="/email" className="text-brand-400 hover:underline">Configurare Email</Link>, <Link href="/runs" className="text-brand-400 hover:underline">Istoric rulări</Link>, <Link href="/documentatie" className="text-brand-400 hover:underline">Documentație</Link>, <Link href="/settings" className="text-brand-400 hover:underline">Setări</Link>.</li>
          </ul>
        </section>

        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3">4. Conexiuni baze de date</h2>
          <p className="mb-3">Din <strong className="text-white">Conexiuni DB</strong> adăugați una sau mai multe conexiuni Oracle. Completați: nume, host, port (de obicei 1521), service name, utilizator și parolă. Puteți apăsa „Testează conexiunea” pentru a verifica înainte de salvare.</p>
          <p>Fiecare job va folosi una dintre aceste conexiuni pentru a rula scripturile de verificare și inserare.</p>
        </section>

        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3">5. Job-uri – URL și extragere date</h2>
          <p className="mb-3">Un job are: <strong className="text-white">URL</strong> (pagina de scanat), <strong className="text-white">conexiune</strong> asignată și <strong className="text-white">configurare de extragere</strong>.</p>
          <h3 className="text-white font-medium mt-4 mb-2">5.1 Tabele detectate automat</h3>
          <p className="mb-3">După ce introduceți URL-ul, apăsați <strong className="text-white">Analizează</strong>. Aplicația detectează tabele HTML pe pagină. Selectați tabelele dorite și mapați coloanele sursă la nume de variabile (target). Aceste nume le veți folosi în scripturi cu <code className="bg-surface-light px-1 rounded">{`{{nume}}`}</code>.</p>
          <h3 className="text-white font-medium mt-4 mb-2">5.2 XPath / CSS → variabile</h3>
          <p className="mb-3">Puteți defini manual perechi <strong className="text-white">selector → variabilă</strong>. Selectorul poate fi XPath (ex: <code className="bg-surface-light px-1 rounded">//span[@class="preț"]</code>) sau CSS (ex: <code className="bg-surface-light px-1 rounded">.preț</code>). Variabila este numele pe care îl folosiți în scripturi.</p>
          <p className="mb-3">Opțional: <strong className="text-white">Selector rânduri</strong>. Dacă îl completați (ex: <code className="bg-surface-light px-1 rounded">//table/tbody/tr</code>), se generează câte un rând per element găsit; selectoarele de câmpuri sunt evaluate în contextul fiecărui rând.</p>
        </section>

        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3">6. Script de verificare (opțional)</h2>
          <p className="mb-3">Checkbox-ul <strong className="text-white">„Folosește script de verificare”</strong> activează sau dezactivează acest script.</p>
          <ul className="list-disc list-inside space-y-1 ml-2 mb-3">
            <li><strong className="text-white">Dezactivat:</strong> scriptul de verificare nu se execută; toate rândurile extrase sunt inserate (scriptul de inserare rulează pentru fiecare).</li>
            <li><strong className="text-white">Activat:</strong> pentru fiecare rând se execută scriptul de verificare. Dacă rezultatul conține o valoare numerică &gt; 0 (ex: COUNT = 1), rândul <strong className="text-white">nu</strong> se inserează. Dacă COUNT = 0, se rulează scriptul de inserare.</li>
          </ul>
          <p>Exemplu script verificare: <code className="block bg-surface-light p-2 rounded mt-2 font-mono text-sm">SELECT COUNT(*) AS cnt FROM produse WHERE cod = {`'{{cod}}'`}</code></p>
        </section>

        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3">7. Script de inserare</h2>
          <p className="mb-3">Folosește variabilele extrase cu <code className="bg-surface-light px-1 rounded">{`{{nume_variabilă}}`}</code>. Exemplu:</p>
          <p className="font-mono text-sm bg-surface-light p-3 rounded">INSERT INTO produse (cod, denumire, pret) VALUES ({`'{{cod}}', '{{denumire}}', '{{pret}}'`})</p>
          <p className="mt-3">Inserarea se execută doar după ce datele au fost extrase de pe site și sunt disponibile în aceste variabile.</p>
        </section>

        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3">8. Programare (scheduler)</h2>
          <p className="mb-3">În job puteți seta:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong className="text-white">Zilnic</strong> – la o anumită oră și minut.</li>
            <li><strong className="text-white">Săptămânal</strong> – zilele săptămânii + oră și minut.</li>
            <li><strong className="text-white">La N ore</strong> – la fiecare 1, 2, 3, 4, 6, 8 sau 12 ore.</li>
          </ul>
          <p className="mt-3">Job-urile active rulează automat conform acestei programări. Puteți și „Rulează acum” din lista de job-uri.</p>
        </section>

        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3">9. Notificări email</h2>
          <p className="mb-3">Din <strong className="text-white">Configurare Email</strong> adăugați un profil SMTP (ex: Exchange/Outlook). În fiecare job puteți alege acest profil și:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Trimite email la <strong className="text-white">succes</strong> către anumiți destinatari.</li>
            <li>Trimite email la <strong className="text-white">eroare</strong> către alți destinatari.</li>
          </ul>
        </section>

        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3">10. Istoric rulări</h2>
          <p>În <strong className="text-white">Istoric rulări</strong> vedeți toate execuțiile job-urilor: dată, status (succes/eroare), număr rânduri inserate și mesaj de eroare (dacă există). Puteți filtra pe job.</p>
        </section>

        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3">11. Setări și utilizatori</h2>
          <p className="mb-3">Din <strong className="text-white">Setări</strong> puteți:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong className="text-white">Adăuga utilizator</strong> – creați un cont nou (utilizator + parolă) pentru a permite accesul altei persoane.</li>
            <li><strong className="text-white">Deconectare</strong> – închideți sesiunea curentă.</li>
          </ul>
          <p className="mt-3">La prima instalare, la primul acces se deschide automat pagina de configurare pentru a seta utilizatorul și parola de administrator. După ce există cel puțin un utilizator, accesul se face doar prin login.</p>
        </section>
      </div>
    </div>
  );
}
