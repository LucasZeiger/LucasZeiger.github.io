import React from 'react';

export const AVAILABILITY = {
  status: true, // Set to false to turn the dot grey
  label: "Let's collaborate!"
};

export const ABOUT_TEXT = (
  <div className="space-y-4">
    <p>I have a background in molecular medicine and disease modelling.</p>
    <p>My current work bridges the gap between molecular and computational biology, aiming to understand fundamental and tumour biology through the lense of spatial -omics methods.</p>
    <p>Based at the CRUK Scotland Institute in Glasgow, Scotland, I work with an excellent multidisciplinary team in the computational biology group, led by Prof. Crispin Miller.</p>
    <p>
      Please reach out if any of my research interests you,
      <a className="text-emerald-400 hover:text-emerald-300 underline ml-1" href="mailto:l.zeiger@crukscotlandinstitute.ac.uk">
        send me an email
      </a>
      , or connect on
      <a
        className="text-emerald-400 hover:text-emerald-300 underline ml-1"
        href="https://linkedin.com/in/lucas-zeiger/"
        target="_blank"
        rel="noreferrer"
      >
        LinkedIn
      </a>
      !
    </p>
  </div>
);
