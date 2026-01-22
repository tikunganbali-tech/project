/**
 * M-02: Image Path Type Lock
 * 
 * Type-level enforcement for image paths.
 * Only allows paths in format: /images/...
 * 
 * This prevents /public/... paths from entering the system.
 */
export type ImagePath = `/images/${string}`;
