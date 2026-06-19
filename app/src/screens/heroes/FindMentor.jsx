import { useNavigate } from 'react-router-dom';
import { HeroSelect } from '../../components/HeroSelect';
import { useOnboardingAnswers } from '../../hooks/useOnboardingAnswers';
import { useHeroRanking } from '../../hooks/useHeroRanking';
import { useChangeHero } from '../../hooks/useChangeHero';
import { useIsDesktop } from '../onboarding/shell';

// "Find a new mentor" — reached from the chat header's ⋮ menu. Mirrors the last onboarding
// hero-selection page, but ranks 8 of all 20 legends (Warren not pinned) from the user's saved
// onboarding answers. Picking one replaces the current advising hero and returns to the chat.
export default function FindMentor() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { answers } = useOnboardingAnswers();
  const { heroIds, isLoading } = useHeroRanking(answers, { includeWarren: true, count: 8 });
  const { mutate: changeHero, isPending } = useChangeHero();

  function handleChoose(heroId) {
    changeHero(heroId, { onSuccess: () => navigate(isDesktop ? '/portfolio' : '/ask') });
  }

  return (
    <HeroSelect
      heroIds={heroIds}
      loading={isLoading}
      onChoose={handleChoose}
      saving={isPending}
      onBack={() => navigate(-1)}
      loadingMessage="Let me look at your goals and find the legends who fit you best…"
      message="Based on your investment goals, style, and experience, here are the investment legends best suited to you."
      ctaPrefix="Make"
      ctaSuffix=" my mentor"
    />
  );
}
