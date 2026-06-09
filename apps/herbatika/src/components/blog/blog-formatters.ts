export const formatBlogDate = (value: string) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
};

export const formatTopicFromKey = (topicKey: string) => {
  switch (topicKey) {
    case "fitness":
      return "Fitness";
    case "krasa":
      return "Krása";
    case "zdravie":
      return "Zdravie";
    default:
      return "Všetky";
  }
};
