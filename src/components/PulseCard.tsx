import { formatRelativeTime } from '../lib/api';

interface PulseCardProps {
  pulse: {
    id: string;
    type: 'bake_started' | 'recipe_dropped' | 'club_call';
    title: string;
    body: string | null;
    member_name: string | null;
    recipe_url: string | null;
    created_at: string;
  };
}

const pulseConfig = {
  bake_started: { label: 'started baking' },
  recipe_dropped: { label: 'New recipe dropped' },
  club_call: { label: 'Club call' },
};

export default function PulseCard({ pulse }: PulseCardProps) {
  const config = pulseConfig[pulse.type];

  return (
    <article className="card">
      <div className="card-header">
        <span className={`pulse-icon ${pulse.type}`} aria-hidden="true" />
        <div>
          <div className="card-title">
            {pulse.type === 'bake_started' && pulse.member_name
              ? `${pulse.member_name} ${config.label}`
              : config.label}
          </div>
          <div className="card-meta">{formatRelativeTime(pulse.created_at)}</div>
        </div>
      </div>
      {pulse.body && (
        <div className="card-body">
          {pulse.recipe_url ? (
            <a href={pulse.recipe_url} target="_blank" rel="noopener noreferrer">
              {pulse.body}
            </a>
          ) : (
            pulse.body
          )}
        </div>
      )}
    </article>
  );
}
