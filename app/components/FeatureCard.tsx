'use client'

import { useScrollReveal } from '../hooks/useScrollReveal';
import type { FeatureItem } from '../../lib/features';

type FeatureCardProps = {
  feature: FeatureItem;
  index: number;
};

const FeatureCard = ({ feature, index }: FeatureCardProps) => {
  const { ref, isVisible } = useScrollReveal(0.1);
  const Icon = feature.icon;

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${index * 100}ms` }}
      className={`group glass rounded-2xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-500 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        <Icon size={22} className="text-primary" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        {feature.title}
      </h3>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {feature.desc}
      </p>
    </div>
  );
};

export default FeatureCard;