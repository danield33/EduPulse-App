from pathlib import Path
from typing import Optional, Iterator
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Query
from fastapi.responses import StreamingResponse
from fastapi_pagination import Page, Params
from fastapi_pagination.ext.sqlalchemy import apaginate
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import base64
import tempfile
import os
import re
from io import BytesIO

from app.config import settings
from app.database import User, get_async_session
from app.models import Video
from app.schemas import VideoRead
from app.users import current_active_user
from app.routes.ttimage import TTImageRequest, generate_image
from app.routes.tts import TTSRequest, synthesize_speech

from app.ffmpeg_cmds import make_video

router = APIRouter(tags=["videos"])

# Ensure video upload directory exists
VIDEO_DIR = Path(settings.VIDEO_UPLOAD_DIR)
VIDEO_DIR.mkdir(exist_ok=True)


def transform_videos(videos: list[Video]) -> list[VideoRead]:
    return [VideoRead.model_validate(video) for video in videos]


class VideoGenerateRequest(BaseModel):
    audio: TTSRequest
    images: TTImageRequest
    lesson_id: UUID
    title: Optional[str]


def safe_b64decode(b64_string: str) -> bytes:
    # Remove data URI prefix if present
    if b64_string.startswith("data:"):
        b64_string = b64_string.split(",", 1)[1]

    # Remove whitespace/newlines
    b64_string = re.sub(r"\s+", "", b64_string)

    # Fix missing padding
    padding_needed = len(b64_string) % 4
    if padding_needed:
        b64_string += "=" * (4 - padding_needed)

    return base64.b64decode(b64_string)


@router.post("/generate", response_model=VideoRead)
async def generate_video(
        request: VideoGenerateRequest,
        user: User = Depends(current_active_user),
        db: AsyncSession = Depends(get_async_session),
) -> VideoRead:
    # image_data = await generate_image(request.images)
    image_data = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBw8NDQ0NDw0NDw0PDQ0NDQ0NDw8NDw0NFREWFhURFRUYHSggGBolHRUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDQ0NEg4PFSsZFRkrKysrKysrKysrKys3KystLSsrKysrKysrKy0tKysrKysrKysrKysrKysrKysrKysrK//AABEIAKwBJgMBIgACEQEDEQH/xAAXAAEBAQEAAAAAAAAAAAAAAAAAAQIH/8QAIRABAQEAAQMEAwAAAAAAAAAAAAERIWGBoQIxcfAiQVH/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A7iAAACW+3Hf+KAAAAJJgKAAAAAAAAAAAAAAAAz6rZfTkt25bx+My3fEndoAAAMAAAAACgAAAAAAAAAAAAAAAAAAACbz7d1AAAAAAAAAAACgAAAAAAAAAaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAABL08qAAAAAEAAAAAAAAAAAAAAAAANABL96qAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAABLAUAAEBQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAIoAAAAAAAAAAAACYoAAAACSqAAAAAAAAAAAAAAAAAAAAAAlgCgAAAAAJd/XHzN4UABKCgAAAAAAAAAAlBRMUAAAAAAAAEqgAAAAD/2Q=="

    # audio_data = await synthesize_speech(request.audio)
    audio_data = "//uUxAAADoVVCOeMYEH2rqH1hJi8A+ikW24LBFdw4GBu4AIREQAAAADd3dz3REABCIEEO7u7u4tEREREL93d3FgCIieiO7v9dy/REABAt3/ruiIkRCgcW7u7ufwIhIiOHFu7u9REQAEIiAYs/9z0TiFxzocW4cDBwEAQUCB+D4Pmvfyn8TwQcUcEi0knHGyQChrMRaa/Liu7iEEURM0kTNEyJa4x7KGBCOkwqPhRRxwUUEok0BJEiE3dpDt1ouZcJPlEFdJ/cdo3M+s6MtGbu1tQV6qXUqeV/W1NItNsqmj0yWOH/L8X/NZrdNKcr8pLY7Pvovsmj6+yjTo1vvNlm703xG1LFKUAiNCrWzWxTvBDL6zV6hlNuAqajpZ+gp6OWudGLeExEq9hZI/159ixeSTo7RK9OH0tqFS61bCjqhPdnB2OVZb326tOqQ3ZwlBvpqNs+sbuCkpWVQNuXykTE4XE/kgw6qjKXlHUVw6JO6ROH6VOEkVoOjmRKKaZ6Jzp//uUxDyAFHXo+i0k1cIvsCH08ycUS0dvGHKdi7mYb+sDo7Gzi4ZQFqTuyCL1sZr46B1Nzi/5lo+829R0gZrJSCkYrZXbWyXBEO9iYXT28m5Z4e9dutSFGu45+26FDrn2jS5Q9XcUhjhv4wKChwUZ4oipSdLoika8GNsWYTJqu0BKU492RjMenDNcpkcXX/jcOru2ena2Ry8n6hkCNq6xNulkyl/IqZ1UD41HVnMFHt90sT8Jyim2hewphLWJOkxKKJXRfvcQT0un9/71CTbd11tjabgx4bpWbRDXTtylSfS2+Mx2v27Q0BCb8oBO+2o01wq01tci1zXIlf1uvM0VLFcunK0Mukq6kfQkMo2oZ5/kPDP1yu8PBGhhtMfUnu1+sqc6VI/cVHYMsoY1QRdQRVRieE9nO1bc9emOZ3rP0k/FBS0C/fVSKUxG1pH1mpq3DyezXYtabI6jZWqcTAwTLCqZ05M0uua8VZNzTeT8dTCpcmm7Pp20tB4WrJIwIKSw//uUxFoADAl9F6WgaeplvR+lhJm4z/zCNJxp/eJ3p2VCumkQXfrlKOyKujT3OKtCCnkzS1QTPQs0Lm3oC0/GyTL3Pj5+g2auG+v9/fGuGl2ycmfe9vdVL1TI0gSjC03fKhB7E22TzhuKI8ccvV0m0026RqSjiSiyE0nhuUCycAwQSijWmMO1llVFC0Rd69pIEzBo42BQx5bofUcMKDppkd1r92c6aL9bIbiNJlPXCASSkiFHdsgKhy33IfokEodHWUkgTKxWz9dNB330XCcQSRJ9qSOTyAJvJxdi69GphII76YHIIs/fWb6Q1E62m5a5Em7SYgRxUEsaWXbQYhuKKOt8BiKBuoWzBGO5gf2btzzp4viO462dP/MSeujOJxx45KgsXrFDpwsAHe6FAuDugfPf03ftKOah4T/Jz+bsKcimWV7L2AdcwekgYic/vHs8wM6bx68X87P5jGQ9s3Zs1nvdZv/nntfZ2iIKzPfn+3bDAPsqMEtI0YojVhmNM100//uUxJKAEdF7CYYky+InL6I1hhmwXKDcyvNnso5AEzV5SOuhke/hnFiG0iGBoEY+BJ3gYChbA6A2zU0RSCQJ9LNfBRdRdeiZwdgiWkikEOjIRCrAYUVMpivphb7SWGkQEoRlBExMQt2kY3EMwRyAcqeVp5G+xHIuIbElcMDzUXb9sbJ4P3HeQMq9ub33UFyVzlzo4TNzXWqvRaFvjUOI0BY1hVuSYTSmRp5KYkZKCDmcYxWl5VgFw5Q0wvByA3ECJwIAEPCbEFEKHaJwLqFISk5y2H+MMnRqGAKQJ4DrHpHWfqOvIqULIIlKqyZT7VjGrNNZ5owy8qSVfOthpFeQnSROhrbo8W1L+P65+PvMGJn3p6woW1Eqxu74V/bFBIlEY7dYmoQ0DApAnDg/TS1jvMqks4ysAXTJnVTNKs8MxGQ7De0eP51szXGDizuNpLgKCExUcjTQuQCjAwA3T6mV0DqBAyaEBtJUrqAINZWSmbJ2iK2rWMAIFHp1ABw5liYR//uUxLuAIq21AA5h7YvzreM17mTYMOVN3AQ6cKhxqSAaAoZMUUoHQweRkDQV3rXjjsyOXVLtjVexTWbk3S3aaWY5fzPLCxvt7XMt8aQ0zuub13W95amKS5V1G+1KS9WlkENxTrTDM5ALsgaICCJgK/iBfBKUOKBgxWAIyTTHDFFEwcO5cNNq/VR96kAsrickoI9HH9aQwx94cvyaYo7Elp871JzX9/O7rfd45YcqdQQqgACbbcalqTgjBZjoiiDCgZipLihZAWDa2FyQJKcSAYiEhhAbrMQACRUqy9Lt9mfOW7z0QiX3kU3mmkf4GXk7aAYvoXDZ8QIAeEwYDLoJ4vuwNb69QEhGCkgeTJnIJBpDWR4cCM7YmzeZZfCrMXofp34jQWAtx4HtsXdZxt9GkUT9yqHKbcOS6G1GkxGUzSk/Mzs0g5g8rMbTMzscJScOiuIogqiKegBi8zQABDIvoZuOB2qQY7jh92zg4gfPyQISyHccle30YHFqtg8sxEtH//uUxGeAG52BNa5hkdMuMCh1p7K+QxXPzAYIiEH5vFefvj0BAStkQLjIKMMFNGKMBlP0mQ1JFoBOQcQgDWJjaAFHBZWhLdYxK8yIVqY6AcRYARgmK1m5NpSLxY9FrKN/hHs8VOKRsZ8Zhx1eRo+oh2sTw5RGkPJGoH58oZQ5I0qnZW1mqdKNHgB5Xi+PHFucJFmdiOlDpr/sbQiRojPgs0GNnedxszsdmVTQYqvL4/dU1eLG070yOLHFy9Lwjj1MtCCQHMh6wI4QigJEw5lQtnsKKz9z1ch1+cvG7kCwt57vdndpxBWWPrHZrpvO8/WBAiayS/Iw6AFUpfg1wZKgQFBkRK5lICi0YGDGXBi3AIqnOOCOZkwiBsE18XUHMHGAw0MwmRA2k5k+X9Sq2drlXlAs1YGJEu5nr6BGZzOTj18yOKQJsrEyhzEoWZQOqlyutNz6RsbmzlVTWy6HNiqZC4D8dbKzPfFTfw6vmVDefvt9T7t5PQJ4Vj4COSlR+D8R//uUxEiAFg11S429cXqkriv1lidXj47B8LTjz7Js0OHyKuyf/ptez/lebXl9pFBQucY7QRwlE9pYm7EVESQC7MFmiYiLBSsz6gUiIEhGuGOOWjMJXgIsSKHcBgpDmWyVvgeX4LvjcoZ8wSWQK+DXLkRlcvfWAmIQJS2ocsR53HlYI+9+zEiPDxfSJifYWUMNgUQdj7aEsvC5mz6tK/czofgXAuP9TpdRBNH7b30xt/zTr////5leooiQgFphRJEVIEI85Ts0SOiXfHzzf6//+169anvlHZJPWbMB2DpV4ph2usalkTgATNGCqVSzOtMUJjJsag63MFE19lB6YkaCgGZBAmiKwCJCECGE8woOZSxsBFIKG6ZFkoQuOkiequGow5EBYNovA+HwOU012uX908hTJd6wnEdSmP+NBg4U+dmIzts9IL/bZH3DaPi8bDjNI4MSoQQtQwhMUGYyRHYJ8tDEIQnEMPVsRwt4nTGZSnVCHGyhAx/jGK+/wwVo1KSF//uUxFEAGe11Yazt53LjLyw9t7KfuVbYWp0lnJKGMd5pnMYLYax/MalcLuNNQqQn0t8538//En8CsLHkh5ldK/sU9CQEJoisy5WiqB0owSCrjA6HIeFMODhMbI30xgYgZsAV4ZCiSkHGgsDmDJoGL0S4wFRJCCGVkAYIgp+OWJ1tFGDNo5m2+Mxk68IKxOmI/m+6dEek22tsZw6m4lvh05KbZdXJnY100zH8lOoJ4vEwBh/CUjNefJ0kvH6hg9od5RZaNptT2XpSZ3LdVr95lSseKqEcVEJsRzcfcXPqdrmT2azbbzvWpHlXUYco2iq6a5aUGD2AjVyy5uIqsAAAAQUQDKkVjJ8PjAkw07CVeTTMFi+dKYu3AadkWFQxDCnMFACNQgfFgAwMBhbMIg4nY2AA9McCcDlZMKwlMCguMAB9Y86jKjhbQvhhsYYg/mbXi6Ku2VFzgOEJETMOAYVGhurGUWHOl0ummrN8XKMMhFSdcVpsDx52VixqrPczwvQi//uUxEIAICGBOe7l84MRq6bh3b04G6KtPxTGtexlcRjL0QA4ZilKdqYF7kmpS7Z/kFRTAo1QvJw/KPZYPeoNxXb5WqpcJ9DzjincLwwCVISUJmM8sKG4syIG+jWcTgD4TIZEwRtoLsxmnSDiR7HkhskzqV/vVYLxxZkIXAzxhgSgypS7GXuGcp9zZN0glPhP48KAAAAgTCQZTKBLemEg7IdzAoHjAeQDw0NAEApmoQF04zE3gCWiIBMoZVdoeFrBT/A1ggu5ZCMBgeytMQw4jAS248Ap7Oi+9eAh4KvxNWcxoLS7lQ9QBqllaui3Zi5is+XJ+mswNf6//z/Wvv7bxPWfywF2yHDzHPBas2KqLAbFM1qSqdj5iQKvXsSM2PszRosr5UKtWnKPUOYZ5N0fdCTw0xkBQnS0dnS7ghSyzvHJnmj6trerz+9P94xvXpFWdzGcCRHA9YAAAAAAHQQoW2AgKuYxbpPmOgIAigoHW5/aQBjRNQx1BVBJh/CQF7lJ//uUxBSAFml9O63lKcpwr2x9l632iIkkSOLcBMu+iiX+e5caaRgDphwPYljntDmbb8upAUIa867ziYCg2T7Lt1tFBhUCQbe5mMJrYy3JgdZeQIM/1WVeSNgmaqaI5JyS42UglPt3c6r3ODHipimyUoyONkJYCVySRMRKaoAJzE0K6zSHGa3dq4bGH/86zJXgigJhIghGDFPnHm2SsWHIIUEJyQyKK2slRrZhIKZgakoIsOOIIzsMRTNNI2BU25H8pCwqhimkEXB+bcMvI8LKJCSC0pRWmASWeynkn1MZZLxGCesDIjXq83wH5fVplisz+2dUjW/1WdIT/T1DSuzjUJKwdnCtMrXOQyp6ZXzeyHILH4felU0cPtSBKKZXYZsNKsmFJubmJetnE+buv//98/Nbqq31Ns0jSNU5SoAEAgAgIAHgAtw0PIiQiA4+tw4Dl+AEAjG/IOYikiPybBARN02Fhl9yQpdN0EWanqYMse8+5cYdIULO209fKYKasinc//uUxCIAGBl9Pe5pi8JQrur1l6JioeV3D8fSpMMGLoUDulwHHffKDJm/YyIwH1y0JS1z/OSt1QextpVpogxo1yeZtebMwUyrKyIxBQ5H/aqy/G8y/FSXILaZHAyKzFDyOknLU5DsTVCivjw+3CgEFxJK6JWsJca3X3DtfetdtPTk0nVnbN65WzdIuYt2Wd/qrXPBAlEmilEi4WvHgmaCSYKoc5MUQAEtBtSBELbSYLghliX7pAB0401/w5GREKHJ0zaI8B9EDgYTxN4d5aM/01C7nXCYBgmAqKxkUqHDGzz1HqpXed5HHpHFdTjJf54u51e5JQgoo4zOOeR1DoTWsPjmr/7+5r4MSFZSlIQUA5h4dFHM0vjb9//+eI4xiLOKJ5PfB1JRwAAAABYPiIBMzCwWNHyAzICkr3MMxhw8F3wUNl2w2hQbcFiFpacuIYQO5mkIrSXYoGYSDD6S2UuENBaj7FlVXP5ajiHR8JuDGYmABImJBadLmCQJeCUUS0kS//uUxC0AGNF5PQ49mpJOK6p9phcYFS8KEEyG+vZgnBiHPdV3+bV1vWKW+qQf5EPg2ofh+McdiKMt2SLk0T6UScjZMTKKBo+JwwVI2DBeuu1AnDM2IsAdEgd6xisf0R8QIBWX3DfhKu9eVWT1eps9O5M7lKJHWC6/GpPop+WbzMxenGBQEFAmxJ7ZUM+CMMHXcBBoBVjQ1LNAIgFNL6Qgp7qyiAakExEWClUKRNqelsJTObLbkdEAFs9/KZVbLo5qmd/f/QLc3IB6dlxpWotSpKRddo/iJ6eIGbzDUGQVQi8tmfp0/L7XQEFiC2sD3URF7iIcJeKVES+raoYrRuiiBWIdlBx4cKNdx0m3/0mQwvCTiIO+HcUGBAYEVkipJ0iGhGDugKg4UN0R0fEg0MjDYM2PXVV810oURQVkYGZBS1rUAjpmq0c7frpN5fceK9l+4Azy1KlznTBwLzlYHQpa5IifoOFRlAIIsLBiSH4i37L+KjxowYDs8jg6/or7OLm9//uUxDWAEhV5U+3hCcIVK2s9hZ6ktf/5r6GXpSdOznQ8MDQ8tTij3l1r5mpr//q7IkNCxD9k2lYr/nXAKADIo9SFRCqLTV3kSbWqTPVIOrd0F8JrTtqMmB6oAVMSkzAFpkEXycJGOBu7etGJiKgZBAqnJyz4gBAziTohUlTB9v5W+klibbCIW1C47dh+T3Qvx2hw+VLpdyG57EXcRndjDrf+9taHOSHZxxUUgGiU5ciSc2punb33VZxAeAB4RxTaoAIAAgE0CAcy8DBIhHVtGBMwOSmjl1Jk2n8Dgh74EIQM0EwV+vcs8HCRu4O+0Zh9YNJKlmqzMV/c7Nv/FcuYOjY7npv7OGoo5MxL5IuQnfhdG75QHORt4I3fwh/ad9+o0VR2K6sURLqWRiFJq3/4ipeR8UHiiCgiBh0RGB0fav0/+Yoqox7xA8t8tKioESCiNJJoqAcSttplLTuQewx9w4LFbVVBGvWHYZg5djNv26b/X5cECq5Q18qSVcxQVT5v//uUxGAAEVVlSc2kukG3qy29gxZeYxRKnDit5SkUYZ//62acynERdrodqnI9jpdzZG/831s53Q4mYDh4YHwKcVYo5WRKP6/3FhUk+al6xAAAAAACaAjDFH3qBAA5xVxUyDFLD9dTsFyIu3dq4dQgeVBYAXhRUSSh8AN1WvXKJ1vFu44XVZmZ2Hc/P2DlCRJ2jIniWJggk4uGt96c3x5B7pk3+zR7h4WHjmAJA0geMJ3REYJEUjj09P/X0ZDoPKOYWDwkpBAeUppP//7KyKZ6iXwBuu0Q2U641IyokWFhOwq5YZ+slhmdSagguMr1isUiIcRSXZ/OmUUk7j8tVFqEAJEitCqWblUvRE0VQsx///mUtDf/Kq2K2BDmYEZ0mM7ZjOUrf//8KJcsUoC0t6lEl5v//+3VZxIapgiBAGQAhsLcZiPHRC5iJMZGBDIabrwmnOJRGiAXMkGyQyVyyku6OhBmYExuDzpXDPWC6gtjNGleyQ9MSXbDG0yzOmGC2lWl//uUxJkAEKFpR60wsUmXLmz1hIm+HStN4zxIREzFJVmHnM7LCFiumZyrv1mKK56DRwmBWdxERaZ0lmGlL/2SxxVBJho4FIBQ6UUOZw8PQPIhi2qqFHei1L/t9pjlFZUeIEgCFAmfDhcdFQqgGysAKiDBggOBTwP89wHBRwHBAOCS3hbFX7BRYNAyyIgpA2IaSJ4+XyZXMTUrS0ThAiAGw4hOI8GRPjmEWKRFisikbjaHKIKOWQAaxLoH1tI2aGhsqfRakzZigsvqNWUx0zRK6JOkyTp53RLxkio88rOkfu32RoskxqeUTKJkWC9Us2OHzczUbJG6KCkUWWfKJotq100Vq9VGtlZojEb5MpVFEABVJSGIRmO5bKRJIlEgwIRzQqxMQmM2NA0jjGieISYLW0KgIaio6DTWAUMeo5SoHIIyYQxEPYYM4XSOEoTujUtJsHBUagAXJwSRJYDGiTD0YDFACCM0JjIcZMOOVKAihhjRgigVBBAxeYQBRvdKPodh//uUxNkAEj1zJi28sUKyLaQet0ABENZ+GCDRBhEBepVR+UlXzeN2rJKJUMS/acziBhGHDiZkxK8lqLCXJe/s8+jm3ZfBfYDpbr6NjZOXTl1Mj+zDB+6CXTX77LKa7Ur3PwVamQmpL29XPLlyazs5XKbG/zd3Kb3Tzde7TUjos2acXIkC7FeNneB+e8w5Y5+OXKf/3MXcqv465vGf3D9be7kMXr1vsvhiy3//qd//wQMGOBxjJGlGYkNpVA0kM+KTklUxnjMlEAZRhhAZSdkhAuslK4fKoCdZQJCgdCAw4MDS00Z8HEA5vF3kFQMUxeICnxJGIB5gB5bp1Zpd69BYyYVGFw4GGCJKyVtIJBAdpU1LX3vSpuQjGKbBCtcqmrd0iV3Nu7smrxWh5atSFBgqhGuPcSgF/5QE9DhLydBh2uVLNPBNRJUZDIOs0RRQcaeuJwnYYk16A4pGoZm5qeld+l/hMJa0IASwarUZhgCp0JAkwZiHoYTCYd19rUtwqzlN//uUxO8AIc17I/nNAARNN+SDN6AAf3hU/tGv506y/H0cNfkzArxNOjUrhmAZx9oZf2W5VrlFTdx5bvf3/pcKC/8NTt6vrn/////////////////8Zcj//NpAAAJRuIsQu8ZseW5AQEHHTQdzMA25vHHoBWGc6HVYgbk0AMxRFVptDltMmgeiL5WOT8Sh9PBp8mNm1Y6tLrtKymTjUwVLSQlbetfV1v3luUnJpkH1WLvMnudXHLbKxmmsV7v+1FU2eci6O9Or0zuc91HWbQVmLb1ZrWvVrOPbOztd39lprMy/Pwr9N4o468qloecujkbKLL+w/AyXo4pAlFBEgRHZ4ms+y52yvzNN9XDJOFgZZ0q0iQoGpLQRFUuhQkKEz3NOWuTG45lEVZ2lr3xYULx5s6iAyyVVIBIh1B4gCp+VXOHS6o9BoR1DJc3XCm2EDAFaPbkjdQvQdDhEkq9CcsOJPlhTCYd4n7/6WUsYRaILiMKrUZh2OI/z9Vo5EIZiIzzd//uUxJOAEf0/IL2mABnbn2Y1hI30kgkhwUQqjhxIcUQSltGSm/BiK+ZEhIeiw1UsPUrQdrUTgZLaVjnMlhUVEzDqcEE2rSp5SGO6nZ+9ARAARjSbiaSOoAx1CU0gUFHEtU9zhqOvFAweHa2hi4cHlgF/Fjp3V2pq+ZulawqLCWBRlMPpkPCYnFZXUXjsrL522uKyNay/oi0MB+oXEqEijOGRrMDtwqmPvCSoUOuWiyntLNrVJNgRPXeqRzJosLsspLwqS4zFSSfVEpV7LUcSLf4rKLXm/svu5a5uOZQptpUgJ5yStCZ6tIpYrUYTajNjc9ulvtN21WK9luoiCma/9oAwLiJdLQBrluCMYSQEfBh2ZqoKZrTcJK1MyHYKV3D8YlTFaZQemSIzVysLxfOwUQzRSjXjPTiI8Jato6PCwtWpGYFC5XdK08wJb+y8esLDyrTFE99MPuQDiAwjCwT44uWpFLyx2F67dW7x+0vOYzwzl3sQodTCok8s8SChiDbI//uUxMWACyyVP+ekbKKvsCM1liZpFhRUN4NDhaJCM4i+IYgO0Rj8txgxpGnc9xU8RuKGONDVFFa1HN+1d/0ihZYLAAAXmGDpginxqINuXKByiwAaMXsTpR9eofA1JID1wKm5OLhXShWWEg7nA6jgsKikdz0ukY6OAnEuFpSdExFAfDiXynx2P5ieFoG5fIDuAcLxISJiGd3MSWX33TMc1yw81wzH02MnCkkMmYCAeyqJcD69cPa8wdElhW2iWRRKixVCXNsWicUJJXHf2Wt4pPn/OlxzWscLy+W5Xtw7szdqtoNrfLZusdOzscHDYIGCm2lSFBCUBCAiAQARDiBQRGmFgaWSCBoaYgSsK1wChQM/AywLhS75jBxvlRwY5fJStCx/iU2YBRLUYmuM0lQyXMobMOKCoFlilDiOpKxkGCDZWfaUwZCdfbeWU7bmuPGMBGpImwWAYsNC1BhEFDDRmB0YzeeQS+XgEOo0aY8YFSTG4SpUXeNFYOcINI5CjfOv//uUxPgAFSV7GSwxE8LjreNmsMAAPUlujpUQjIAHnSTAwAwQCgAJAebhEExMJfhMEfCnkfJfbw5RFtEORehYhqQrYwcHV4Z86LIAcPMAsKkYOEGwIJc1qR5Kexhjnb4h3MyPMyxMSAHgAsAh9YRvkMzM0QfzMUdHnaR8SEIElFI8FgV3v//9///+PMXrlUOUEFyJVRXkPu/k/5bwtugu6TqUb6OkFgsPMKTgcDn/////////////////////SzFjdPnY/5flz/////////////+tD8amZFZ3jQXUirV1MK2iISVqBFnOwQgORxYiWCYnARZxrSBOBlUatB0hD11ETrzGTw6Gh0FF62/5bejNPWgX9ZiR9qnKvtaWVzZCdNo4dqMWiXzj+7Gwkxr07YlCz8G7X01tlEGSJU5rmO29m1+Rgk/wsirNUSeiUnb1WEC672E2qK4NykxBTUUzLjEwMKqqqqqqqqqqqpBUSFZiQoBIvZq4yYIlIFCiAL9HugUA//uUxPyAKm4RN9mtAAHxp2z/nmABHMLBoSiIxxmGO6IAgGRAEwP0AhFWXmjuYemCzCIrrV7lnv3W5mDcM9JvrM2RMxrgKkpNsaxtf2P2AmIpNqv6xVJm/aMxl0veOtw5Ks6VMY1jBzweUPP/CkVNO4dFNhjYcBhaSDJLjadgYeBSjU4ozlSGmwqYbIsGmGypH1A/9qeOKjE23PHlKjIAa4L/zvGlSMGupVMVzSAk3ErLxW99Fazz5krKdWzi27//Torq7HCYgZ0EBVFvtNR0b70WmupSlth0kouJrI1Z6J/vGC1vTGXElGgg/bXEkONKJJyMuLBBWcYLp7AsTRINolYiAtb7cDKConjb6SJzwdiyi3dk6IBPQZ95sTSjBNovTDOkAmGz7uh69//swuTYARY3G/nr//751ktjGo3gKgTgiDVvROrarQs3hE2pV5v9P6NH7E42UWgIR1Qah8PWHTh6WFkyzGqjVVP/dJtWUhcytUAAAWkDEOpgOKRpVBQs//uUxMEADu1JW+ywbUnYLeu1lJZqmYUOo1TGMwNCkxv70zpIQwYCszwcYw9AwxQNIxoFEEAwYhByLCWBAsNBgTMEArMLwdMYAlGgAMBAuAwRCIiBY2XOXcooEKpUGMIUHmAkbNRgkm2aFwAcOHJBQFfKxF6g1UvoCQXWYipe0oDOvFyTja9MtSF+IKN4ACORoTN1MOWcNjVV9X6pjVX29ps30olCSPj0gmkbRzobqZivhKvTsaSXrd51AnJIke+YVNuFFd6RoSsa2UtgziiO5fA4ByhVFYYZSmMdJbXUZbiL8d8ywaWn3uHbes+PmHqG26hu7scNXoQroqEzPH2Ht4b1TEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVXEhglJgpxsmPMh3CF4MIIhUBaxFck0NRoUm8mQRaJsyd1Od+UAfMkCFMhicjcvBEgO0jQ4vEgRBY8jR0lau62WfcpmgwOmr4nm//uUxP+AEMVtZ6ylU/PqsCYd3L5YM///1/ptJTdb2Gh5MgezrTVqMp9GWrP/88VLKn/UNElmm6pyjpcgVvhsf/Fb//3TvbEJNu2WnCJ86xqMkgSS2i3Gyq5QM2fIXhTxQIqGOM5IDTjVVF302rqyju3tZXmCyG+uQTQq1YLMmr5cI6YlRj2ap3nvAyQALtL0KBBwrv+iq5aBZ6MISq/f9vndP5TZ6tZn5SwOhLdJeWU3H1VokxlMMOSaw+pqlf754nVtZK/lJfHTQ2GpgDTJBUjSXZJYsfVll1aSa+f/7drSgtOO4vXPacQ90qqEAAAFEAwkBpKjLQz8FuxCkWoluCyTSjFdw4mX1DHERMALi4wXoYMSHyWVY65zkdnTDK+TzxFEnQ4vqrFPyuUZUusrUecdDnCk/Yp5ZvWS7ZI7EOCiQjbmwIQ4K6OrpHTV/iv+P47xmbKqiI9neoZFSB4zp9bjPKy5w+raeFLKq5LsnwMNAsVOEepMsBtogCfFREAI//uUxNoAEJFxYawlcTJqrmv1hiZ3VCIlTG52hnH1r6r///zh4vI0JGbxi73z6RjEAClkxcxIFwDHHJMVrIBXwwMbT6CmMhDs41vDrIcMpE47gGTCwoAE6MPAgw4vTAAKSEMgCxgxCkmZJQwiTIcmnwYjHaWzAstGjpsVUcIVlA3EwHFxhAtLqfAgSlDpqEQK7UNGynrpXaSUz08V6g/T+ZGWZhvCmeU7RF/8DGpqRocHY5WU9qQ1AqDAYGEf6cN1Pt70/GqLeNNV/aP6axuV6pWydWLcKaPAgs6Ka3cY43GLz+YynU7xNsR40YtR6q1bbK41/j5gfVUjl0qMSUw4agw2xopJqoRDBCNUWOXSN7MLIAjbzAyhrYi8vtiawi87ftbg58XMmmh2DBsG+oZyaUjaJMavSARWRubeI6ryym2Uxm+5sHXDcFkkeaZT99Pnp9CmCAoQ6B9BIOCZ0EBYxr2zTf/S35yjxEDC4GIYXnHmd/df/4iLCR7OdaWAAAAA//uUxP+AFdlxT609M/tXLmaNzL4hAClyDgWNm30W2VWdEtYMKQhPS5OMvwVNY6IPzjgAQxnRq+GDotmaFdmjZSpemkgsmEIHmGhPmEYBhccbsShuYoSRH0nEETshUOyVZaTS7CwfLvhQKa4QADBmYaV5aIHLxUOEKaphgYkyVcEAU00BUXT3SHWu3SCWXr1rp9ICAcLGYj2J5FziTcX+mfr7i4VUrKzF+UyHGCdwEkl1f0MR9DrP1dNLbHjRWfOqWjUxuauMQc4hN0KHdXKRDD8PAtB0C6I0hBRn6sl+JS0spzi5HiT1TLhhup3kdtz9V+96xelrquM8YNRKQqwqwFcKoWUqTEFNRTMuMTAwqqqqqqqqqqqqqqqqqqqTMjAjRVjd0jecoV+W5vsJRIqoSWLPg+XFbZG9Kks3aCNeSHHEGhlRK7ruJaQrLwkxlj+fYVFyW44BupjsPgogYLBQGwifcbw9f///jKJDqkUgXMhzTqIUpuJa+Kmv/j9MZbPA//uUxPKADsFdc+wssbvNLiVt3T4p40OhOKDhMSkh1ZI/Fov/a7//+PdSmi6itcrxpAQJSaJTSBghBCvAh6dSMDUMEEvQPGCqBovsWUqBd6T5tQhj9cChO68afFA0qQOiriVuzI5qRUrWZqPUj/sjR8iENSCUwBD9Rk8TnYvLpsS05UQnuWpJV2D8YDd6szN86/dPTuz++wch8iAgAwVuFJUDFAPeOF7Ji8dMrqu0xa7MzNZnN6JyptZL7x35fIlD7LgSUr7k1LooX5MDhZ109c8sXltuX6x/Pjfo5saFIbqFM+iYa46eb5/fQJWkhAgqK3Q6AIzlTBbXq6RqgxsVUOtdKtxBoeZCiDsSpCLrdWgS0qX9k6j08gm1Ux8xX7a8fH8/TyHskJ++VqmVsVXxn2qvW+XE1dw3FqKqzl/u39Pn/7//+IM7aIAhCKVLTOPiDlKULFETlmLHJRBvX//+ys5q8SmeTIpabjpHoVimkPQ/AgEsgzcyOTDequY5+v9F//uUxOeAD+FvcewxDzrtrqp1lj9neElruuWtfpOoAEg1sCEHzHB+TOkQUdzQogjC0CDD0jD8M7jCoejEckjk0HDAsHTDtAjIIKQaBZjgmJjWCYYNM51AQcVAgZhT1y1y1C9pdhqzirXkqE6SsiYImGIxxpxLLVgUzUe0eUqUBYWHkBIugoMz9FIXMm4hxxpyUnpG12njHFhbsQtWm8el83+PbWZ8YynR1lIPEn5YEOlNhDV1pdqjqd5JGrNGl1ddQp9x6a1m1oi6ipw8ox/p1CUYehpBEHYiwV5zjeNNTALKfjiE1UJ1MTM9YmZ7Bivv//7Yzm7klFXHniSsM8jHHlSCoCd5pUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVeggkpYilEwZCk12kkW9M+Xo1VIVzIipa68BIrPJEWuTLgrCRR4mh6cb6N14w4/Cjy0davjHlgqd1G1Ge72KD5T1roqH/6DUBFOOxIRcVV2Syoty//uUxP+AE6FzV4y9cfOeLmXJ3T3o0Mn//+dTDCAUVKhFMev//bdgmGkVOVDlF18FCpN2WzVgws0iZNHhssMgWNScC5omemTPGnaC3J6W9ATnSE43g5ii+g4fPzq3Igj0ijFl1D0i4VnxmHZSAUBooNrVVDmzoaCeIJNGRWORu88UG4RH0vCOctfLXy3T2rQb9q4vad0oR2BaU6cSN8ocTaS40Vc+cIsE9p1EqY+W3cvOn///FYmIWPn4hRHqoVpgo0fxeQkpVIexOycIhyY13eBCz4FM63///GiwPHogFeqbwoE20OSilVhbCrFMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVeTFWpLGnEgYoqDGE7xKqqQnGzG1ovMDpWyCpZdT2jL2wzM0kaFgY0DXwf0V+X5LQ3qB8r5wUrymlzhhZMwYNl0Qplgt7TOZMZifRZ4sLqmSNXNa5+LuOv///n5kYjSLKZLM+yAeCMWKeY15/bnj//65r+SxAQQi//uUxN8ATZVvZawYszL1rioxpj6nBwdAPEEFLA2BsKCwsdP1Ny61Hz/Vc3zR+0IbEia2OMnD8SVWi9I20QWXJARcghhGddIhUGfANSFRo8WGBhmBgXAsEWmirKWCoO3qq5nW3fYK6iYy6obpYxGIZcF/TjExQw/jKc2hTPmp3BkyilGWFfFKRsVFEKTa63WC9g639+uIb3Vsf49ZL4vWx7GoN81S3NbIl1IpVdA+fX73XP/+f6/+urQnK8J93bi/LzRtiODScwsTCu1QrE+ywnk73WqtqxTe/9a+dxp15b5rpHCiQ44+UHqjRSpMQU1FMy4xMDCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqsAoHThyQaBwImH4VmahUjeHGCwEGDqQBxJJdmHxfkwlCjDm0OMXoA8XLCwwuyOKUiQkLNw6oAjSytKCGnVWfzcoSCi5KhuRbO9ZHzNthL6qkOG8p0YJCloM//uUxPEAEwlzWay9EfrTr6j1p5r/rAnytYYT99KdTnKys6YVSegPoTmwfV7WhW+vk3k4ddzeKJBF1OGjpcWpV7h8+xaHV4+np6xPBgbpmLN8WZVKcsE/WxmVzk9WCFLqqkUyaRqvs9vBfIlhi0ZWvEafECk954OcbkjRMfsU27PtS9bgcUse12tbchugSQLgHUpSKDSJcTpyP45o6mL3qCmpGLCQvejLEeLLzcRC8G6ed2m4LzCWrR7xjLrdwUPe7og9bf/7iKoJYmkql99k/23TVo+UwiFIyMIIUjD1M7lIIB8QKYNB2lGpkdVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVIMFbbsjbRBUlQQGT5GZAJbigAv6jklLTCQodCMh7CtYRIW41DYqp3yv2ul9bgUaWcdjtkcWF4zLmekeL+TRcrpogLkH7EAcs5RqyG6sWn0UmCBt7eZ3a8LjKKB0RRAnvLMj///uUxOIAGOlzH07h6Mmgp2o08xX25vTwt7/iG/2b3zuNL/as9HVhxLYTXnrNyYTaf8+l/5L/zPb4WRNIRUpQQjuFdX//+kkdoLTmicDwFaQQWLELAEIZMiJMChCy0GAcO7cfZQcRIWA9IMRcOMeMc7tvPIkiNYHE7zRV7AoVYrNvdKxYa1NudT1c5aOnJ44RD6o2PlO71uimZp1waHdRK+BiA2ZrfwWGNZ+lKedsls5avFpW872qrgQVu93lmyBh/WkB5G3tzrlxg3pEgNbmz1m/vaNve/FjtUSuIuIGb33rM//x/WPa0IRJ+61AMDIIAsfpwNDZyBoBAQGzlDTDpzUBRQmaxCOETKlxhQEXgM1TiEJ83I00tUx7pvTDASYHUFM5OjRBQviARpDcOD3IOorDBb41IbNBRCEFkgBATGQEv4ZA9HAPhq5CBQRJ4AgECSGBnUSQJgkBDqwhpKaQD7InadZI2lZG389SuPLxEGhCWaOBkA+GIZEHthAgComw//uUxOcAEYFjN608y7K3LKY+svAFksi1WX16SnqPxAYYImPhqcs2AgswEDGQ1/W7MvcdTHjWYvA8Zgd55yXwOqYIBkpQoEGDgStoABiYTcGSx2kdadtQDRfnnnqPwufsusW8SEiLKEki/JEBs6ijVtSOho6kVku6lvuH/rl7//vl3AgKSQikOSBB9Yr9WYncryaIqPNOjlqKXsMZ/n//////////////////////542+8/Dfy////////////////ndV56CtcsUbAJBi0MANTPBAoYC/OwR8uAdSCsLMP2Oi1TGBBIxJROh9D4fIYAwTgiD4xBBY3QJ0GJpap5NszCtnzR89QS17PNgrQKi3OFEtd520zaXUxdJ83dyydjblsRF1OvTO5nv9l9U7qvfFX39JSbnrNu2JS2p6q33cNfD3W5M5vpkXPFo0UkxBTUUzLjEwMKqqqqqqqqqqqqqLAAMiW0j2DoupHyzKrWzwHIY289zka5KLIaytzki0IA0Q//uUxP+AKJYFM7mtgAIVLWiznrABGUAGkeI69VB5xFc8amdvypDfM9MQ4jNumnJSM8edzScRWnFDN1MjmJcg0iZhe1xGVCXQ169i1U3FD46RuJIFlakva0pfoc1m6mpt/l0KdYzr04ennZ/IIiqHGinVLPUScfWQu8qafCEVtkqpPZrb/bN/Nx51TbmI1omqu6QJbJZLxuC/YTahJlCT/Qs5FKb7jZLRNqsaSOx3p8r0P69hU7vaizBQTrDASOtDKzldAU13RgrPoUqsiFR+90Xa10dDNoZbVfTdkShrylrKWbo+t9Pq3gpUXzV0eXeoVQKScb1g0dOVSjQE1kbQNFTICrSHboXGIgqptLB4DAhgydHhuBSSTg5MDJ4bqO2y4zfeL6lYpboy4/y85das7SrvuXgTKRCQ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bfNW29QwjPVqwkXQzJPDyH5AwIgE6oKupnc4Mu1XlK8Zt8zyxIGQcOEYUsVxi2WizTjU9yoBCQAwCt4KAxZMYc0/YkBUaLmI7hYGWdYKWbQdjE7CGeuS2TUDGAogaRkC1BNAU2RKHuQY6UAuZHqpirKZhrqI3KqdU7cYSmc5HTHHfszDeeJnTnaifYX7yZnxGjQGJ6/cIX06YHz+JZ6qEfbW6Z09tHrque9yzbiUjQWXW268kabEOHhkjyQ7e87y//uUxPYAFyFdE40w14KcreIlpI7wJHp9bvV89l1rFosema/5pL8Yxitq33n2r9YxJ7eJrXgTWvfzZ1avv8Xv6+mc0pm+P5Nyryt792qJdAAAhTzJgAAAAGVrmxKnGfD1o5Ck3aYOCgAMW0Z8YYMFhjI2CoGs6EIsyI9lBk+7STJOjJoRDINcxM0TLrBZej4PAAiQcJEa+SXebgousxKp3QCCBVs0xQmAqAtNopbBUbh9Pp2VOxLAaUqJAg7lDbX41IY5GZM9b9P3Q2AMAkRQBLxuUgfNNejlLjbppRGJZDsPSenAgJuZMFLjtIULL+SiY3Yr0VFAUI1S36aV01O0dUCCeCkYy4DpokzNPm2erEa1WcvYYU9SEVpucjfly2UJZF2GRiQEOBoBFdKQpZVV72rHvyxuTNFKJ25yzT8ptY4XfVOoKs9MRhz8MTclz2GPtOPvUn7tiU1c4nO0VjLk3nLLOP/////////8sz3jhuvXpqe7d5S63XpP//////////uUxPsAGJ25CxWngA0UxGBnNaAA/3ZkUmysYSaL5SeUTj8OnLnPa5tMQU1FMy4xMDCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqoBAKBQOBwOBQGAwIBgAsmFJ+GfCEXhacAi/BuiFmfAx64AEsDB/4GORgEDwLBPwMSSASGC0sDDEQEBf/FKBb8H7DJhZ0P1//IgITDlE+LlICTn/+MsQ4nxWo5JOCthyv//IuKBGNIAKCHKI8dpMkd///jSIEMaRAujlFcvDkkUYmj//9dTAmWIgqApMQU1FMy4xMDCqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//uUxI+AEVlHD7kqAAAAADSDgAAEqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"

    # --- Decode audio base64 (assuming mp3) ---
    audio_bytes = safe_b64decode(audio_data)
    audio_path = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3").name
    with open(audio_path, "wb") as f:
        f.write(audio_bytes)

    # --- Decode image base64 (assuming jpg/png) ---
    image_bytes = safe_b64decode(image_data)
    image_path = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg").name
    with open(image_path, "wb") as f:
        f.write(image_bytes)

    # --- Output video path ---
    output_path = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4").name

    # --- FFmpeg command to combine image + audio ---
    make_video(image_path, audio_path, output_path)

    with open(output_path, "rb") as f:
        file_bytes = f.read()
    headers = {"content-type": "video/mp4"}
    upload_file = UploadFile(
        filename=f"Clip.mp4",
        file=BytesIO(file_bytes),
        headers=headers
    )
    return await upload_video(f"Clip", None, upload_file, db, user)


@router.post("/upload", response_model=VideoRead)
async def upload_video(
        title: str = Form(...),
        description: str | None = Form(None),
        file: UploadFile = File(...),
        db: AsyncSession = Depends(get_async_session),
        user: User = Depends(current_active_user),
) -> VideoRead:
    """Upload a video file to disk and save metadata to database"""

    # Validate file type
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")

    # Read file to check size
    file_content = await file.read()
    file_size = len(file_content)

    if file_size > settings.MAX_VIDEO_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum allowed size of {settings.MAX_VIDEO_SIZE} bytes"
        )

    # Create unique filename
    file_extension = os.path.splitext(file.filename or "video.mp4")[1]
    unique_filename = f"{user.id}_{title.replace(' ', '_')}_{file.filename}"
    file_path = VIDEO_DIR / unique_filename

    # Save file to disk
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")

    # Create database record
    db_video = Video(
        title=title,
        description=description,
        filename=unique_filename,
        file_path=str(file_path),
        file_size=file_size,
    )

    db.add(db_video)
    await db.commit()
    await db.refresh(db_video)

    return db_video


@router.get("/", response_model=Page[VideoRead])
async def list_videos(
        db: AsyncSession = Depends(get_async_session),
        user: User = Depends(current_active_user),
        page: int = Query(1, ge=1, description="Page number"),
        size: int = Query(10, ge=1, le=100, description="Page size"),
) -> Page[VideoRead]:
    """Get all videos for the authenticated user"""
    params = Params(page=page, size=size)
    query = select(Video).filter(Video.user_id == user.id).order_by(Video.created_at.desc())
    return await apaginate(db, query, params, transformer=transform_videos)


@router.get("/{video_id}", response_model=VideoRead)
async def get_video(
        video_id: UUID,
        db: AsyncSession = Depends(get_async_session),
        user: User = Depends(current_active_user),
) -> VideoRead:
    """Get a specific video's metadata"""
    result = await db.execute(
        select(Video).filter(Video.id == video_id, Video.user_id == user.id)
    )
    video = result.scalars().first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found or not authorized")

    return video


@router.get("/{video_id}/stream")
async def stream_video(
        video_id: UUID,
        db: AsyncSession = Depends(get_async_session),
        user: User = Depends(current_active_user),
) -> StreamingResponse:
    """Stream a video file"""
    result = await db.execute(
        select(Video).filter(Video.id == video_id, Video.user_id == user.id)
    )
    video = result.scalars().first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found or not authorized")

    file_path = Path(video.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found on disk")

    def iterfile() -> Iterator[bytes]:
        with open(file_path, mode="rb") as file_like:
            yield from file_like

    return StreamingResponse(
        iterfile(),
        media_type="video/mp4",
        headers={
            "Content-Disposition": f'inline; filename="{video.filename}"'
        }
    )


@router.delete("/{video_id}")
async def delete_video(
        video_id: UUID,
        db: AsyncSession = Depends(get_async_session),
        user: User = Depends(current_active_user),
) -> dict[str, str]:
    """Delete a video and its file from disk"""
    result = await db.execute(
        select(Video).filter(Video.id == video_id, Video.user_id == user.id)
    )
    video = result.scalars().first()

    if not video:
        raise HTTPException(status_code=404, detail="Video not found or not authorized")

    # Delete file from disk
    file_path = Path(video.file_path)
    if file_path.exists():
        try:
            os.remove(file_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to delete video file: {str(e)}")

    # Delete database record
    await db.delete(video)
    await db.commit()

    return {"message": "Video successfully deleted"}
