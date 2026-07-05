import classes from './Description.module.css';
import descriptions from '../Store/description.json';
import { useParams } from 'react-router-dom';
import ProblemContext from './ProblemContext';

export default function Description() {
  const { id } = useParams();
  const selectedDisability = descriptions[id];

  if (!selectedDisability) {
    return (
      <div className={classes.contentContainer}>
        <p className={classes.notFound}>Disability information not found.</p>
      </div>
    );
  }

  return (
    <>
      <ProblemContext />
      <div className={classes.contentContainer}>
        {selectedDisability.tldr && (
          <div className={classes.tldrCard}>
            <span className={classes.tldrLabel}>Quick Summary</span>
            <p className={classes.tldrText}>{selectedDisability.tldr}</p>
          </div>
        )}

        <h1 className={classes.disabilityTitle}>{selectedDisability.title}</h1>

        {selectedDisability.sections.map((section, index) => (
          <section key={index} className={classes.section}>
            <h2 className={classes.sectionTitle}>{section.heading}</h2>

            {typeof section.content === 'string' && (
              <p className={classes.sectionContent}>{section.content}</p>
            )}

            {Array.isArray(section.content) && (
              <ul className={classes.sectionList}>
                {section.content.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            )}

            {section.examples && section.examples.length > 0 && (
              <div className={classes.examplesBlock}>
                <span className={classes.examplesLabel}>Examples</span>
                {section.examples.map((example, idx) => (
                  <p key={idx} className={classes.exampleItem}>{example}</p>
                ))}
              </div>
            )}

            {section.closing && (
              <div className={classes.highlightBox}>
                <p>{section.closing}</p>
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
