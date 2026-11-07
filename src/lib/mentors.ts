const mentorAvatars: Record<string, string> = {
  "mentor-nadia-islam": "/images/mentor-nadia.jpg",
  "mentor-riya-sharma": "/images/mentor-riya.jpg",
  "mentor-ethan-park": "/images/mentor-ethan.jpg",
  "mentor-marcus-reed": "/images/mentor-marcus.jpg",
  "mentor-lena-chen": "/images/mentor-lena.jpg",
  "mentor-leadership-lead": "/images/mentor-tariq.jpg",
  "mentor-finance-lead": "/images/mentor-kamrul.jpg",
  "mentor-digital-lead": "/images/mentor-farah.jpg",
  "mentor-da-01": "/images/mentor-kamrul.jpg",
  "mentor-da-02": "/images/mentor-anisur.jpg",
  "mentor-el-02": "/images/mentor-anisur.jpg",
  "mentor-el-03": "/images/mentor-tariq.jpg",
  "mentor-cf-02": "/images/mentor-tariq.jpg",
  "mentor-cf-03": "/images/mentor-anisur.jpg",
  "mentor-cf-04": "/images/mentor-kamrul.jpg",
  "mentor-dt-02": "/images/mentor-tariq.jpg",
  "mentor-dt-03": "/images/mentor-kamrul.jpg",
  "mentor-dt-04": "/images/mentor-anisur.jpg",
  "mentor-dt-05": "/images/mentor-tariq.jpg",
  "mentor-so-01": "/images/mentor-tariq.jpg",
  "mentor-so-02": "/images/mentor-anisur.jpg",
  "mentor-so-03": "/images/mentor-kamrul.jpg",
  "mentor-so-04": "/images/mentor-tariq.jpg",
  "mentor-so-05": "/images/mentor-anisur.jpg",
  "mentor-so-06": "/images/mentor-kamrul.jpg",
  "mentor-pg-01": "/images/mentor-kamrul.jpg",
  "mentor-pg-02": "/images/mentor-anisur.jpg",
  "mentor-pg-03": "/images/mentor-tariq.jpg",
};

const defaultAvatars = [
  "/images/mentor-nadia.jpg",
  "/images/mentor-ethan.jpg",
  "/images/mentor-riya.jpg",
  "/images/mentor-marcus.jpg",
  "/images/mentor-lena.jpg",
];

export function getMentorAvatar(
  mentor: { id: string; portraitSrc?: string },
  index: number = 0
): string {
  if (mentor.portraitSrc) return mentor.portraitSrc;
  if (mentorAvatars[mentor.id]) return mentorAvatars[mentor.id];
  return defaultAvatars[index % defaultAvatars.length];
}
