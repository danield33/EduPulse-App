import {AnimatePresence, motion} from "framer-motion";
import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";

interface ImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { url?: string; prompt?: string }) => void;
    currentImage?: { url?: string; prompt?: string } | null;
}

export function ImageUploadModal({
                                             isOpen,
                                             onClose,
                                             onSave,
                                             currentImage,
                                         }: ImageModalProps) {
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [promptText, setPromptText] = useState(
        currentImage?.prompt || ""
    );

    useEffect(() => {
        (async () => {
            if(currentImage?.url){
                const res = await fetch(currentImage.url);
                const blob = await res.blob();
                const file = new File([blob], "tmp_image", { type: blob.type });
                setUploadFile(file)
            }else if(currentImage?.prompt){
                setPromptText(currentImage.prompt)
            }
        })();

    }, [currentImage]);


    const handleSave = () => {

        const saveObj: {url?: string, prompt?: string} = {
            url: undefined,
            prompt: undefined,
        }

        const localUrl = uploadFile ? URL.createObjectURL(uploadFile) : null;
        if(localUrl)
            saveObj.url = localUrl;

        if(promptText.trim() && !localUrl) //prefer file upload
            saveObj.prompt = promptText;

        onSave(saveObj);

        setPromptText("");
        setUploadFile(null);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{opacity: 0}}
                    animate={{opacity: 1}}
                    exit={{opacity: 0}}
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                >
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 shadow-lg">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                            Add or Update Image
                        </h3>

                        <div className="space-y-4">
                            {/* Upload option */}
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                    Upload image file
                                </label>
                                <div className="flex flex-col space-y-2">
                                    <input
                                        id="image-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />

                                    <label
                                        htmlFor="image-upload"
                                        className="cursor-pointer inline-block px-4 py-2 rounded-md bg-blue-600
                                        text-white text-sm hover:bg-blue-700 transition text-center"
                                    >
                                        {uploadFile ? "Replace Image" : "Upload Image"}
                                    </label>

                                    {uploadFile && (
                                        <img
                                            src={URL.createObjectURL(uploadFile)}
                                            alt="Preview"
                                            className="mt-3 rounded-md max-h-48 object-cover"
                                        />
                                    )}
                                    {uploadFile && (
                                        <button
                                            type="button"
                                            onClick={() => setUploadFile(null)}
                                            className="text-sm text-red-600 hover:underline mt-2"
                                        >
                                            Remove Image
                                        </button>
                                    )}

                                </div>

                            </div>

                            <div className="text-center text-gray-400 text-sm">
                                — or —
                            </div>

                            {/* AI Prompt option */}
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                    AI generation prompt
                                </label>
                                <textarea
                                    value={promptText}
                                    onChange={(e) => setPromptText(e.target.value)}
                                    className="w-full border rounded-md p-2 h-20 bg-gray-50 dark:bg-gray-900 dark:text-white resize-none"
                                    placeholder="e.g., 'A nursing student talking with a professor in a clinical classroom'"
                                />
                            </div>
                        </div>

                        <div className="text-center text-gray-400 text-sm">
                            *File upload will overwrite ai prompt
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <Button variant="outline" onClick={() => {
                                setPromptText("");
                                setUploadFile(null);
                                onClose()
                            }}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave}>Save</Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
