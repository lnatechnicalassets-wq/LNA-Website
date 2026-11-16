export const mentorMediaBucket = "mentor-media";
export const mentorMediaPath = "/api/mentor-media/";
export const mentorMediaBytes = 1_400_000;
export const mentorMediaSide = 1600;
export const mentorMediaKey =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export const mentorDisplayCopy = {
  info: "Info",
  infoFor: (name: string) => `View mentor info for ${name}`,
};

export function usesMentorMediaSource(src: string) {
  return src.startsWith(mentorMediaPath) || src.startsWith("blob:");
}
