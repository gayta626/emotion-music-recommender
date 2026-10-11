import './PageAmbient.scss';

// Nen "bau troi dem" sau moi trang (NYX = Night Music Society): 3 quang sang lon kieu cuc quang troi cham + sao li ti.
// Mau doi theo trang dang mo hoan toan bang CSS (body:has(.ten-trang) trong PageAmbient.scss) -> trang nao cung
// khong can bao gi cho component nay; rieng trang ca si dat bien --artist-h (sac do anh ca si) len <html>.
const PageAmbient = () => <div className="page-ambient" aria-hidden="true" />;

export default PageAmbient;
