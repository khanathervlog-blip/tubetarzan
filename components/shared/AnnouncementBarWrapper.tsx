"use client";

import AnnouncementBar from "./AnnouncementBar";

interface Props {
  message: string;
  link?: string;
  linkText?: string;
}

export default function AnnouncementBarWrapper({ message, link, linkText }: Props) {
  return <AnnouncementBar message={message} link={link} linkText={linkText} />;
}
